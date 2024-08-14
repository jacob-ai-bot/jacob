import type OpenAI from "openai";
import dedent from "ts-dedent";
import {
  type Model,
  sendGptRequest,
  sendGptRequestWithSchema,
  sendGptToolRequest,
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

export enum ResearchAgentActionType {
  ResearchCodebase = "ResearchCodebase",
  ResearchInternet = "ResearchInternet",
  AskProjectOwner = "AskProjectOwner",
  ResearchComplete = "ResearchComplete",
}

export interface Research {
  todoId: number;
  issueId: number;
  type: ResearchAgentActionType;
  question: string;
  answer: string;
}

const researchTools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: ResearchAgentActionType.ResearchCodebase,
      description: "Analyze the existing codebase for relevant information.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "The detailed, full-sentence search query to search within the codebase.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: ResearchAgentActionType.ResearchInternet,
      description:
        "Search the internet for specific details if there are unique aspects that need further understanding.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The query to search on the internet.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: ResearchAgentActionType.AskProjectOwner,
      description:
        "Ask the project owner for any additional details or clarifications.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The question to ask the project owner.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: ResearchAgentActionType.ResearchComplete,
      description:
        "Confirm that the most important information has been gathered to address the issue.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

export const researchIssue = async function (
  githubIssue: string,
  sourceMap: string,
  todoId: number,
  issueId: number,
  rootDir: string,
  projectId: number,
  maxLoops = 10,
  model: Model = "gpt-4o-2024-08-06",
): Promise<Research[]> {
  console.log("Researching issue...");
  // First get the context for the full codebase
  const allFiles = traverseCodebase(rootDir);
  const codebaseContext = await getOrCreateCodebaseContext(
    projectId,
    rootDir,
    allFiles?.map((file) => standardizePath(file)) ?? [],
  );
  // For now, change the sourcemap to be a list of all the files from the context and overview of each file
  sourceMap = codebaseContext
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
  const userPrompt = parseTemplate(
    "research",
    "research_issue",
    "user",
    researchTemplateParams,
  );
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  let allInfoGathered = false;
  const gatheredInformation: Research[] = [];
  const questionsForProjectOwner: string[] = [];
  let loops = 0;

  while (!allInfoGathered && loops < maxLoops) {
    loops++;
    const response = await sendGptToolRequest(
      messages,
      researchTools,
      0.3,
      undefined,
      2,
      60000,
      model,
      "required",
      true,
    );

    const toolCalls = response.choices[0]?.message.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      allInfoGathered = true;

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name as ResearchAgentActionType;
        if (!Object.values(ResearchAgentActionType).includes(functionName)) {
          console.error(`Invalid function name: ${functionName}`);
          continue;
        }
        if (functionName === ResearchAgentActionType.ResearchComplete) {
          allInfoGathered = true;
          break;
        }
        const args = JSON.parse(toolCall.function.arguments) as {
          query: string;
        };
        console.log(`Calling function: ${functionName} with arguments:`, args);
        const functionResponse = await callFunction(
          functionName,
          args,
          githubIssue,
          sourceMap,
          rootDir,
          codebaseContext,
        );
        if (functionName === ResearchAgentActionType.AskProjectOwner) {
          questionsForProjectOwner.push(args.query);
        } else {
          const research: Research = {
            todoId,
            issueId,
            type: functionName,
            question: args.query,
            answer: functionResponse,
          };
          gatheredInformation.push(research);
          await db.research.create(research);
        }
        allInfoGathered = false;
      }

      if (!allInfoGathered) {
        const updatedPrompt = dedent`
            ### Gathered Information:
            ${gatheredInformation.map((r) => `### ${r.type} \n\n#### Question: ${r.question} \n\n${r.answer}`).join("\n")}
            ### Questions for Project Owner:
            ${questionsForProjectOwner.join("\n")}
            ### Missing Information:
            Reflect on the gathered information and specify what is still needed to fully address the issue and why it is needed.
            ### Plan Information Gathering:
            Decide on the best action to obtain each missing piece of information (ResearchCodebase, ResearchInternet, AskProjectOwner, ResearchComplete).
            Choose the correct tools and formulate very specific, detailed queries to gather all of the missing information effectively. If you need to ask follow-up questions, only ask up to 5 additional questions. Each question should be a full sentence and clearly state what information you are looking for.
            ### Important:
                If you have all the necessary information to proceed with the task, return a single tool call to confirm that the research is complete. If you need more information, ask up to 5 additional questions to gather it.
        `;
        messages.push({ role: "assistant", content: "Research Step Complete" });
        messages.push({ role: "user", content: updatedPrompt });
      }
    } else {
      allInfoGathered = true;
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
      // just return the question for now
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
      2,
      60000,
      null,
      "claude-3-5-sonnet-20240620",
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
const RelevantFilesSchema = z.string();
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
              `${file.file} - ${file.overview}. Diagram: ${file.diagram ?? ""}`,
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
    const relevantFiles = (await sendGptRequestWithSchema(
      selectFilesUserPrompt,
      selectFilesSystemPrompt,
      RelevantFilesSchema,
      0.3,
      undefined,
      3,
      "gpt-4o-2024-08-06",
    )) as RelevantFiles[];

    // convert relevant files to standard paths
    const standardRelevantFiles = relevantFiles.map(standardizePath);

    // Filter the relevant files to ensure they exist in allFiles
    const filteredRelevantFiles = standardRelevantFiles.filter((file) =>
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
