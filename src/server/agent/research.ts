import { dedent } from "ts-dedent";
import {
  type Model,
  sendGptRequest,
  sendGptRequestWithSchema,
} from "~/server/openai/request";
import { db } from "~/server/db/db";
import { parseTemplate } from "../utils";
import {
  type ContextItem,
  getOrCreateCodebaseContext,
} from "../utils/codebaseContext";
import { traverseCodebase } from "../analyze/traverse";
import { type StandardizedPath, standardizePath } from "../utils/files";
import { z } from "zod";
import { ResearchAgentActionType } from "~/types";
import { researchQuestions } from "~/data/researchQuestions";
import { TodoStatus } from "../db/enums";

export interface Research {
  todoId: number;
  issueId: number;
  type: ResearchAgentActionType;
  question: string;
  answer: string;
  projectId?: number;
}

interface ResearchIssueParams {
  githubIssue: string;
  todoId: number;
  issueId: number;
  rootDir: string;
  projectId: number;
  maxLoops?: number;
  model?: Model;
}

const ResearchSchema = z.object({
  questions: z
    .array(
      z.object({
        type: z.nativeEnum(ResearchAgentActionType),
        question: z.string(),
      }),
    )
    .max(10),
});
type ResearchSchema = z.infer<typeof ResearchSchema>;

export const researchIssue = async function ({
  githubIssue,
  todoId,
  issueId,
  rootDir,
  projectId,
  maxLoops = 1, // don't loop for now, we'll just do one pass
  model = "claude-3-5-sonnet-20241022",
}: ResearchIssueParams): Promise<Research[]> {
  console.log("Researching issue...");
  // First get the context for the full codebase
  const allFiles = traverseCodebase(rootDir);
  const query = `Based on the GitHub issue, your job is to find the most important files in this codebase.\n
  Here is the issue <issue>${githubIssue}</issue> \n
  Based on the GitHub issue, what are the 100 most relevant files to resolving this GitHub issue in this codebase? Order them from most relevant to least relevant. After identifying the top 10 most relevant files, prioritize other files that are closely related to the most important files, such as other files in the same directory or files that implement the same interface or have similar functionality.`;
  const relevantFiles = await selectRelevantFiles(
    query,
    undefined,
    allFiles,
    100,
  );

  const codebaseContext = await getOrCreateCodebaseContext(
    projectId,
    rootDir,
    relevantFiles.map((file) => standardizePath(file)) ?? [],
  );
  // For now, change the sourcemap to be a list of all the files from the context and overview of each file
  const sourceMap = codebaseContext
    .map((file) => `${file.file} - ${file.overview}`)
    .join("\n");

  const researchTemplateParams = {
    githubIssue,
    sourceMap,
  };
  const systemPrompt = parseTemplate(
    "research",
    "research_issue",
    "system",
    researchTemplateParams,
  );
  let userPrompt = parseTemplate(
    "research",
    "research_issue",
    "user",
    researchTemplateParams,
  );

  const gatheredInformation: Research[] = [];
  let loops = 0;

  while (loops < maxLoops) {
    loops++;
    try {
      const response = (await sendGptRequestWithSchema(
        userPrompt,
        systemPrompt,
        ResearchSchema,
        0.3,
        undefined,
        3,
        model,
      )) as ResearchSchema;

      for (const question of response.questions) {
        const functionResponse = await callFunction(
          question.type as ResearchAgentActionType,
          question.question,
          githubIssue,
          sourceMap,
          codebaseContext,
        );
        const research: Research = {
          todoId,
          issueId,
          type: question.type,
          question: question.question,
          answer: functionResponse,
        };
        gatheredInformation.push(research);
        await db.research.create(research);
      }
      if (response.questions.length === 0) {
        break;
      }
      userPrompt = dedent`
      ### Gathered Information:
      ${gatheredInformation.map((r) => `### ${r.type} \n\n#### Question: ${r.question} \n\n${r.answer}`).join("\n")}
      ### Missing Information:
      Reflect on the gathered information and specify what is still needed to fully address the issue and why it is needed.
      ### Plan Information Gathering:
      Decide on the best action to obtain each missing piece of information (ResearchCodebase, ResearchInternet, AskProjectOwner).
      Choose the correct types and formulate very specific, detailed queries to gather all of the missing information effectively.
      ### Important:
      If you have all the necessary information to proceed with the task, return an object that matches the ResearchSchema schema with an empty array of questions. Otherwise, generate up to 10 additional questions to gather more information.
    `;
    } catch (error) {
      console.error("Error in research loop:", error);
      break;
    }
  }

  if (loops >= maxLoops) {
    console.log("Max loops reached, exiting loop.");
  }
  return gatheredInformation;
};

async function callFunction(
  functionName: ResearchAgentActionType,
  question: string,
  githubIssue: string,
  sourceMap: string,
  codebaseContext: ContextItem[],
): Promise<string> {
  switch (functionName) {
    case ResearchAgentActionType.ResearchCodebase:
      return await researchCodebase(question, githubIssue, codebaseContext);
    case ResearchAgentActionType.ResearchInternet:
      return await researchInternet(question);
    case ResearchAgentActionType.AskProjectOwner:
      // just return a blank answer, the user will answer it later
      return "";
    default:
      return "Function not found.";
  }
}

export async function researchCodebase(
  query: string,
  githubIssue: string,
  codebaseContext: ContextItem[],
): Promise<string> {
  const allFiles = codebaseContext.map((file) => standardizePath(file.file));

  let relevantFiles: string[];
  if (allFiles.length <= 50) {
    relevantFiles = allFiles;
  } else {
    relevantFiles = await selectRelevantFiles(query, codebaseContext);
  }
  // get the context for all of the relevant files
  const relevantContext = codebaseContext.filter((file) =>
    relevantFiles.includes(file.file),
  );

  const codebase = JSON.stringify(relevantContext, null, 2);
  const sourceMap = codebaseContext
    .map((c) => `${c.file}: ${c.overview}`)
    .join("\n");

  const codeResearchTemplateParams = {
    codebase,
    sourceMap,
    githubIssue,
    query,
  };

  const codeResearchSystemPrompt = parseTemplate(
    "research",
    "research_codebase",
    "system",
    codeResearchTemplateParams,
  );
  const codeResearchUserPrompt = parseTemplate(
    "research",
    "research_codebase",
    "user",
    codeResearchTemplateParams,
  );
  let result: string | null = "";

  // First try to send the request to the claude model. If that fails because the codebase is too large, call gemini.
  try {
    result = await sendGptRequest(
      codeResearchUserPrompt,
      codeResearchSystemPrompt,
      0.3,
      undefined,
      0, // no retries, so we can quickly failover to gemini
      60000,
      null,
      "claude-3-5-sonnet-20241022",
    );
  } catch (error) {
    result = await sendGptRequest(
      codeResearchUserPrompt,
      codeResearchSystemPrompt,
      0.3,
      undefined,
      2,
      60000,
      null,
      "gemini-1.5-pro-latest",
    );
  }

  return result ?? "No response from the AI model.";
}
// Define the schema for the response
const RelevantFilesSchema = z.object({
  files: z.array(z.string()),
});
type RelevantFiles = z.infer<typeof RelevantFilesSchema>;

export async function selectRelevantFiles(
  query: string,
  codebaseContext?: ContextItem[],
  allFiles?: StandardizedPath[],
  numFiles = 50,
): Promise<StandardizedPath[]> {
  if (!codebaseContext && !allFiles) {
    throw new Error("Either codebaseContext or allFiles must be provided.");
  }
  if (allFiles && allFiles.length <= numFiles) {
    return allFiles;
  }
  const selectFilesTemplateParams = {
    query,
    allFiles: allFiles
      ? allFiles.join("\n")
      : codebaseContext
          ?.map(
            (file) =>
              `${file.file} - ${file.text}\n Diagram: ${file.diagram ?? ""}`,
          )
          .join("\n") ?? "",
    numFiles: numFiles.toString(),
  };
  if (!allFiles) {
    allFiles = codebaseContext?.map((file) => standardizePath(file.file));
  }

  const selectFilesSystemPrompt = parseTemplate(
    "research",
    "select_files",
    "system",
    selectFilesTemplateParams,
  );
  const selectFilesUserPrompt = parseTemplate(
    "research",
    "select_files",
    "user",
    selectFilesTemplateParams,
  );

  try {
    const response = (await sendGptRequestWithSchema(
      selectFilesUserPrompt,
      selectFilesSystemPrompt,
      RelevantFilesSchema,
      0.3,
      undefined,
      3,
      "claude-3-5-sonnet-20241022",
    )) as RelevantFiles;

    if (!response.files) {
      throw new Error("No files found in response");
    }

    // convert relevant files to standard paths
    const relevantFiles = response.files
      .map(standardizePath)
      .filter((p) => p?.length);

    // Filter the relevant files to ensure they exist in allFiles
    const filteredRelevantFiles = relevantFiles.filter((file) =>
      allFiles?.some((setFile) => setFile === file),
    );

    console.log("Top 10 relevant files:", filteredRelevantFiles.slice(0, 10));
    console.log(
      `Bottom ${numFiles - 10} relevant files:`,
      filteredRelevantFiles.slice(-10),
    );
    // remove duplicates and return the top numFiles
    return Array.from(new Set(filteredRelevantFiles)).slice(0, numFiles);
  } catch (error) {
    console.error("Error selecting relevant files:", error);
    return [];
  }
}

export async function researchInternet(query: string): Promise<string> {
  const internetResearchTemplateParams = {
    query,
  };

  const internetResearchSystemPrompt = parseTemplate(
    "research",
    "research_internet",
    "system",
    internetResearchTemplateParams,
  );
  const internetResearchUserPrompt = parseTemplate(
    "research",
    "research_internet",
    "user",
    internetResearchTemplateParams,
  );

  const result = await sendGptRequest(
    internetResearchUserPrompt,
    internetResearchSystemPrompt,
    0.3,
    undefined,
    2,
    60000,
    null,
    "llama-3.1-sonar-large-128k-online",
  );

  return result ?? "No response from the AI model.";
}

export async function getOrCreateResearchForProject(
  projectId: number,
  codebaseContext: ContextItem[],
  shouldRefresh = false,
): Promise<Research[]> {
  try {
    const gatheredInformation: Research[] = [];
    const research = (await db.research.where({
      todoId: 0,
      issueId: 0,
      projectId,
    })) as Research[];
    if (research?.length > 0 && !shouldRefresh) {
      return research;
    }
    // if there is no todo with id 0, create a new todo
    const todo = await db.todos.findByOptional({ id: 0 });
    if (!todo) {
      // if there is no project with id 0, create a new project
      const project = await db.projects.findByOptional({ id: 0 });
      if (!project) {
        await db.projects.create({
          repoFullName: "",
          repoNodeId: "",
          repoName: "",
          id: 0,
          // @ts-expect-error bigint
          repoId: 0,
        });
      }
      await db.todos.create({
        name: "Project Level Research",
        description: "Research the project as a whole",
        id: 0,
        status: TodoStatus.TODO,
        projectId: 0,
      });
    }

    for (const question of researchQuestions) {
      const answer = await researchCodebase(
        question,
        "Project Level Research",
        codebaseContext,
      );

      const research: Research = {
        todoId: 0, // project level research is not associated with a todo
        issueId: 0, // project level research is not associated with a issue
        type: ResearchAgentActionType.ResearchCodebase,
        question,
        answer,
        projectId,
      };
      gatheredInformation.push(research);
      await db.research.create(research);
    }

    return gatheredInformation;
  } catch (error) {
    console.error(
      `Error getting or creating research for project ${projectId}:`,
      error,
    );
    return [];
  }
}
