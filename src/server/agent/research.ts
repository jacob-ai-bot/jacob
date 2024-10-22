import type OpenAI from "openai";
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

export interface Research {
  todoId: number;
  issueId: number;
  type: ResearchAgentActionType;
  question: string;
  answer: string;
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

type ResearchResponse = z.infer<typeof ResearchSchema>;

interface ResearchIssueParams {
  githubIssue: string;
  todoId: number;
  issueId: number;
  rootDir: string;
  projectId: number;
  maxLoops?: number;
  model?: Model;
}

export const researchIssue = async function ({
  githubIssue,
  todoId,
  issueId,
  rootDir,
  projectId,
  maxLoops = 10,
  model = "claude-3-5-sonnet-20241022",
}: ResearchIssueParams): Promise<Research[]> {
  console.log("Researching issue...");
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
      const response = await sendGptRequestWithSchema(
        userPrompt,
        systemPrompt,
        ResearchSchema,
        0.3,
        undefined,
        3,
        model,
      );

      for (const question of response.questions) {
        const functionResponse = await callFunction(
          question.type,
          { query: question.question },
          githubIssue,
          sourceMap,
          rootDir,
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
        If you have all the necessary information to proceed with the task, return an empty array of questions. Otherwise, generate up to 10 additional questions to gather more information.
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
  args: { query: string },
  githubIssue: string,
  sourceMap: string,
  rootDir: string,
  codebaseContext: ContextItem[],
): Promise<string> {
  switch (functionName) {
    case ResearchAgentActionType.ResearchCodebase:
      return await researchCodebase(
        args.query,
        githubIssue,
        sourceMap,
        rootDir,
        codebaseContext,
      );
    case ResearchAgentActionType.ResearchInternet:
      return await researchInternet(args.query);
    case ResearchAgentActionType.AskProjectOwner:
      return args.query;
    default:
      return "Function not found.";
  }
}

export async function researchCodebase(
  query: string,
  githubIssue: string,
  sourceMap: string,
  rootDir: string,
  codebaseContext: ContextItem[],
): Promise<string> {
  const allFiles = codebaseContext.map((file) => standardizePath(file.file));

  let relevantFiles: StandardizedPath[];
  if (allFiles.length <= 50) {
    relevantFiles = allFiles;
  } else {
    relevantFiles = await selectRelevantFiles(query, codebaseContext);
  }
  const relevantContext = codebaseContext.filter((file) =>
    relevantFiles.includes(file.file),
  );

  const codebase = JSON.stringify(relevantContext, null, 2);

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

  try {
    result = await sendGptRequestWithSchema(
      codeResearchUserPrompt,
      codeResearchSystemPrompt,
      z.string(),
      0.3,
      undefined,
      3,
      "claude-3-5-sonnet-20241022",
    );
  } catch (error) {
    console.error("Error in researchCodebase:", error);
    result = "An error occurred while researching the codebase.";
  }

  return result;
}

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
    allFiles = codebaseContext?.map((file) => standardizePath(file.file)) ?? [];
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
    const response = await sendGptRequestWithSchema(
      selectFilesUserPrompt,
      selectFilesSystemPrompt,
      RelevantFilesSchema,
      0.3,
      undefined,
      3,
      "claude-3-5-sonnet-20241022",
    );

    if (!response.files) {
      throw new Error("No files found in response");
    }

    const relevantFiles = response.files
      .map(standardizePath)
      .filter((p): p is StandardizedPath => p !== undefined);

    const filteredRelevantFiles = relevantFiles.filter((file) =>
      allFiles?.some((setFile) => setFile === file),
    );

    console.log("Top 10 relevant files:", filteredRelevantFiles.slice(0, 10));
    console.log(
      `Bottom ${numFiles - 10} relevant files:`,
      filteredRelevantFiles.slice(-10),
    );
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

  try {
    const result = await sendGptRequestWithSchema(
      internetResearchUserPrompt,
      internetResearchSystemPrompt,
      z.string(),
      0.3,
      undefined,
      3,
      "claude-3-5-sonnet-20241022",
    );
    return result;
  } catch (error) {
    console.error("Error in researchInternet:", error);
    return "An error occurred while researching the internet.";
  }
}
