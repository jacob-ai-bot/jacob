import OpenAI from "openai";
import dedent from "ts-dedent";
import {
  MAX_OUTPUT,
  type Model,
  sendGptRequest,
  sendGptToolRequest,
} from "../openai/request";
import { getCodebase } from "./files";
import {
  evaluate,
  sendSelfConsistencyChainOfThoughtGptRequest,
} from "../openai/utils";
import { PlanningAgentActionType } from "../db/enums";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export enum ResearchAgentActionType {
  ResearchCodebase = "ResearchCodebase",
  ResearchInternet = "ResearchInternet",
  AskProjectOwner = "AskProjectOwner",
  ResearchComplete = "ResearchComplete",
}

export interface PlanStep {
  type: PlanningAgentActionType;
  title: string;
  instructions: string;
  filePath: string;
  exitCriteria: string;
  dependencies?: string;
}

export interface Plan {
  steps: PlanStep[];
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

const planningTools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: PlanningAgentActionType.EditExistingCode,
      description:
        "Modify an existing file in the codebase to address a specific aspect of an issue.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description:
              "Provide a concise and descriptive title for the specific task to be performed.",
          },
          instructions: {
            type: "string",
            description:
              "Provide clear, detailed, and actionable instructions on the precise changes to be made to the file. Do NOT provide code snippets, only instructions.",
          },
          filePath: {
            type: "string",
            description:
              "Specify the absolute file path of the existing file to be edited. This is cricitally important for the developer to locate the file accurately.",
          },
          exitCriteria: {
            type: "string",
            description:
              "Define measurable and verifiable criteria that must be satisfied to consider this step complete. If possible, these should exactly match a subset of exit criteria found in the original issue.",
          },
          dependencies: {
            type: "string",
            description:
              "Identify any previous steps in the plan that need to be completed before this step. If there are no dependencies, skip this field.",
          },
        },
        required: ["instructions", "filePaths", "exitCriteria"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: PlanningAgentActionType.CreateNewCode,
      description:
        "Create a new file in the codebase to implement a specific functionality or feature.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description:
              "Provide a concise and descriptive title for the specific task to be performed.",
          },
          instructions: {
            type: "string",
            description:
              "Provide comprehensive and precise instructions on the desired functionality. These instructions should be detailed enough for another developer to implement the feature without further clarification.",
          },
          filePath: {
            type: "string",
            description:
              "Specify the absolute file path where the new file should be created, considering the project's directory structure and naming conventions.",
          },
          exitCriteria: {
            type: "string",
            description:
              "Define clear and measurable criteria that must be met to consider the new code complete and ready for integration. If possible, these should exactly match a subset of exit criteria found in the original issue.",
          },
          dependencies: {
            type: "string",
            description:
              "Identify any previous steps in the plan that need to be completed before this step. If there are no dependencies, skip this field.",
          },
        },
        required: ["instructions", "filePaths", "exitCriteria"],
      },
    },
  },
];

export const researchIssue = async function (
  githubIssue: string,
  sourceMap: string,
  rootDir: string,
  maxLoops = 3,
  model: Model = "claude-3-5-sonnet-20240620",
): Promise<string> {
  //  - ResearchInternet: Search the internet for specific details if there are unique aspects that need further understanding.
  const systemPrompt = dedent`You are an advanced AI coding assistant designed to efficiently gather information and address GitHub issues. Your role is to analyze the provided GitHub issue, codebase source map, and previously gathered information to determine the necessary steps for resolving the issue.

    Key Responsibilities:
        1. Thoroughly understand the GitHub issue and its requirements.
        2. Assess the available information, including the codebase, external resources, and previous clarifications.
        3. Identify any missing information that is crucial for addressing the issue.
        4. Decide on the most effective actions to obtain the missing information:
            - ResearchCodebase: Analyze the existing codebase for relevant information.
            - ResearchInternet: Search the internet for specific details if unique aspects require further understanding
            - AskProjectOwner: Only if absolutely necessary, ask the project owner for additional details or clarifications.
        5. Formulate clear and concise questions or queries for each action to gather the missing information.
        6. If all necessary information is available, proceed with providing a solution to the GitHub issue.
        
    Guidelines:
        - Maintain a professional and objective tone throughout the information gathering process.
        - Break down complex issues into smaller, manageable tasks.
        - Prioritize the most critical missing information first.
        - Never respond with text questions, use the provided tools to gather the required information.
        - Provide clear reasoning for each identified missing piece of information and how it relates to the issue.
        - Ensure that the planned actions and queries are detailed, specific, relevant, and likely to yield the required information.
        - If no further information is needed, confidently state that you have sufficient details to proceed with resolving the issue.
        
    Remember, your goal is to efficiently gather all necessary information to provide a comprehensive solution to the GitHub issue. Approach the task methodically to ensure that no details are overlooked.`;

  //2. **ResearchInternet:** Search the internet for specific details if there are unique aspects that need further understanding.
  const userPrompt = dedent`You are an AI coding assistant tasked with addressing a specific GitHub issue for a codebase. Your first step is to gather all necessary information to fully understand the issue and its context. Your goal is to identify all missing information and determine the best way to obtain it using the following tools:

    - **ResearchCodebase:** Analyze the existing codebase for relevant information. This is the preferred tool for most queries.
    - **ResearchInternet:** Search the internet for specific details if there are unique aspects that need further understanding.
    - **AskProjectOwner:** Ask the project owner for any additional details or clarifications. This tool should rarely be used, if ever. Only use this if there is no other way to obtain the information.
    - **ResearchComplete:** Confirm that the most important information has been gathered to address the issue.

    ### GitHub Issue Details:
        - **Issue:** ${githubIssue}
        - **Repo Source Map:** ${sourceMap}

    ### Task:
        1. **Initial Understanding:**
            - Understand the GitHub issue and its requirements.
            - Identify the goal and what needs to be achieved.

        2. **Assess Available Information:**
            - Review the provided codebase information, external information, and previous clarifications.
            - Determine what information is already available.

        3. **Identify Missing Information:**
            - Reflect on the provided details and identify all missing pieces of information needed to fully address the issue.
            - Specify clearly what information is missing and why it is needed.

        4. **Plan Information Gathering:**
            - Decide on the best action to obtain each missing piece of information (Research Codebase, Research Internet).
            - Formulate the specific questions or queries for each action.

    Choose the correct tools and formulate very specific, detailed queries to gather all of the missing information effectively. If you need to ask questions, only ask a maximum of 5 questions. Each question should be a full sentence and clearly state what information you are looking for.
    ### Important:
        If you have all the necessary information to proceed with the task, return a single tool call to confirm that the research is complete. If you need more information, use up to 5 of the appropriate tools to gather it.`;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  let allInfoGathered = false;
  const gatheredInformation: string[] = [];
  const questionsForProjectOwner: string[] = [];
  let loops = 0;

  while (!allInfoGathered && loops < maxLoops) {
    loops++;
    const response = await sendGptToolRequest(
      userPrompt,
      systemPrompt,
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
        );
        messages.push({
          role: "function",
          name: functionName,
          content: functionResponse,
        });
        if (functionName === ResearchAgentActionType.AskProjectOwner) {
          questionsForProjectOwner.push(args.query);
        } else {
          gatheredInformation.push(
            `### ${functionName} \n\n#### Question: ${args.query} \n\n${functionResponse}`,
          );
        }
        allInfoGathered = false;
      }

      if (!allInfoGathered) {
        const updatedPrompt = dedent`
            ### Gathered Information:
            ${gatheredInformation.join("\n")}
            ### Questions for Project Owner:
            ${questionsForProjectOwner.join("\n")}
            ### Missing Information:
            Reflect on the gathered information and specify what is still needed to fully address the issue and why it is needed.
            ### Plan Information Gathering:
            Decide on the best action to obtain each missing piece of information (ResearchCodebase, ResearchInternet, AskProjectOwner, ResearchComplete).
            Choose the correct tools and formulate very specific, detailed queries to gather all of the missing information effectively. If you need to ask questions, only ask a maximum of 5 questions. Each question should be a full sentence and clearly state what information you are looking for.
            ### Important:
                If you have all the necessary information to proceed with the task, return a single tool call to confirm that the research is complete. If you need more information, use up to 5 of the appropriate tools to gather it.
        `;
        messages.push({ role: "user", content: updatedPrompt });
      }
    } else {
      allInfoGathered = true;
    }
  }

  if (loops >= maxLoops) {
    console.log("Max loops reached, exiting loop.");
  }
  return `## Research: ${gatheredInformation.join("\n")} \n\n## Questions for Project Owner: \n\n [ ] ${questionsForProjectOwner.join("\n [ ] ")}`;
};

async function callFunction(
  functionName: ResearchAgentActionType,
  args: { query: string },
  githubIssue: string,
  sourceMap: string,
  rootDir: string,
): Promise<string> {
  switch (functionName) {
    case ResearchAgentActionType.ResearchCodebase:
      return await researchCodebase(
        args.query,
        githubIssue,
        sourceMap,
        rootDir,
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
): Promise<string> {
  // Alternative approach - use GPT-4 to ask for the 50 most relevant files in the source map and just get those
  const codebase = await getCodebase(rootDir);

  const codeResearchSystemPrompt = dedent`You are an AI coding assistant named CodebaseResearcherGPT, designed to help users gather comprehensive information from a codebase to solve issues or implement new features. Your primary objective is to provide detailed and structured information based on the codebase, following a specific rubric.

  When a user presents a research question related to an issue or feature, carefully analyze the provided codebase and extract relevant information in the following categories:
  
  Required Information:
  1. Detailed Specifications:
     - Provide a clear and descriptive title for the specific query that you are answering.
     - Write a concise description of why the information is needed and how it will be used.
  
  2. File Structure and File Paths:
     - Identify and list the existing files that need to be modified, including their full paths.
     - Specify the paths for any new files that need to be created.
     - Provide an overview of the directory structure to help understand the file organization.
  
  3. Code Snippets:
     - Include relevant code snippets from the codebase that can serve as references for maintaining consistency in style and conventions.
     - Highlight any specific coding conventions or style guides that should be followed.
     - Provide examples of similar components or functions to guide the implementation.
  
  Optional Information (only provide this if it is relevant to the query):
  4. API Contracts:
     - Define the API endpoints that need to be created or modified, including HTTP methods and URLs.
     - Detail the required and optional parameters for each request, including data types and validation rules.
     - Describe the structure of the API responses, including data types and example JSON payloads.
     - Specify how errors should be handled and returned by the API.
     - Provide code snippets of relevant APIs or examples of similar functions to guide the implementation.
  
  5. Component Breakdown:
     - Break down the implementation into individual frontend components and backend modules.
     - Describe the purpose and functionality of each component or module in detail.
     - Explain how the components and modules fit into the overall feature.
     - Provide code snippets of relevant components or examples of similar components or functions to guide the implementation.
  
  6. Styles and Themes:
     - Specify the stylesheets that need to be modified or created.
     - List the CSS classes that should be used, along with their definitions.
     - Include any design guidelines or themes that need to be followed.
     - Describe how the feature should adapt to different screen sizes and devices for responsive design.
  
  When presenting the information, organize it in a clear, detailed, and structured manner, using appropriate headings, bullet points, and code blocks. Ensure that the information is comprehensive and detailed enough to enable the user to successfully complete the task without the need for further clarification.

  For each request, you must provide very detailed information to address all of the required aspects of the rubric. Only include optional information if it is relevant to the specific query.
  
  If the codebase lacks sufficient information to cover all aspects of the rubric, indicate which areas are missing and suggest potential sources or methods to obtain the necessary details.
  
  Remember, your knowledge is limited to the contents of the provided codebase. Do not make assumptions or provide information that is not directly supported by the codebase. If you are unsure about any aspect, clearly state that limitation in your response.
  
  When you have completed your analysis and have a structured response ready, present the information without any additional formatting or conversation. The user will review your response and provide further instructions if needed.`;

  const codeResearchUserPrompt = dedent`### START CODEBASE
    <Codebase>
    ${codebase}
    </Codebase>
    ### END CODEBASE

    Source Map:
    ${sourceMap}

    Original Issue:
    ${githubIssue}
    
    Research Question:
    ${query}
    Please analyze the provided codebase and attempt to answer the research question. Provide a clear and concise response summarizing your findings, including relevant file paths, function names, and code snippets to support your answer. If the codebase does not contain enough information to fully answer the question, please indicate that additional information may be needed.`;

  const result = await sendGptRequest(
    codeResearchUserPrompt,
    codeResearchSystemPrompt,
    0.3,
    undefined,
    2,
    60000,
    null,
    "gemini-1.5-pro-latest",
  );
  return result ?? "No response from the AI model.";
}

export async function researchInternet(query: string): Promise<string> {
  const internetResearchSystemPrompt = dedent`You are an AI coding research assistant named CodebaseResearcherGPT. Your primary role is to help developers gather comprehensive and accurate information from the internet on coding-related topics. Your responses should be well-structured, detailed, and precise, providing developers with the information they need to understand or solve coding issues.

    Your response should:
    - Be clear and concise.
    - Use bullet points or numbered lists where appropriate.
    - Include code snippets in code blocks where relevant.
    - Be written in a professional and informative tone.`;

  const internetResearchUserPrompt = dedent`Coding Research Query:
    ${query}
    
    Please search the internet and gather the most relevant and credible coding-related information regarding the query. Your summary should include:
    1. Detailed explanations of the topic.
    2. Relevant code snippets.
    3. References and sources for the information provided.
    4. Best practices and common pitfalls.
    5. Relevant documentation or tutorials.

    Ensure that the information is comprehensive and detailed enough to enable the developer to successfully use it without the need for further clarification. If there are multiple perspectives or solutions, present them clearly, highlighting the most credible and widely accepted points.`;

  const result = await sendGptRequest(
    internetResearchUserPrompt,
    internetResearchSystemPrompt,
    0.3,
    undefined,
    2,
    60000,
    null,
    "llama-3-sonar-large-32k-online",
  );

  return result ?? "No response from the AI model.";
}

export const findFiles = async function (
  githubIssue: string,
  sourceMap: string,
  research: string,
): Promise<string> {
  const systemPrompt = `You are an AI coding assistant tasked with identifying the specific files in a codebase that need to be modified or created to address a GitHub issue. Your role is to analyze the provided GitHub issue, codebase source map, and research to determine the files that require changes.

    Here is the issue that you are responsible for:
    <issue>
    ${githubIssue}
    </issue>

    Key Responsibilities:
        1. Understand the GitHub issue and its requirements.
        2. Review the codebase source map to identify the relevant files and their locations.
        3. Analyze the gathered research to determine any specific files mentioned or implied.
        4. Identify the files that need to be modified or created to address the issue.
        5. Determine the exit criteria that will be met by modifying each file.
        6. Most importantly, provide a detailed list of the exact file paths for each file to be modified or created.
        
    Guidelines:
        - Ensure that the identified files are directly related to the GitHub issue.
        - List the full file paths for each file, including the directory structure.
        - Provide a very concise one-sentence description of why each file needs to be modified or created.
        - Consider the impact of the changes on other parts of the codebase. Use the source map to try to identify potential dependencies.
        - Double-check that all necessary files are accounted for in the list.
        - Do not make assumptions about the GitHub issue or exit criteria, only use the provided information to identify the files.
        
    Remember, your goal is to accurately identify a concise list of the most critical files that need to be modified or created to address the GitHub issue. Your list should be detailed enough for a developer to locate and work on the files effectively.`;

  const userPrompt = `You are an AI coding assistant tasked with identifying the specific files in a codebase that need to be modified or created to address a GitHub issue. Your goal is to analyze the GitHub issue, codebase source map, and research to determine the necessary files for resolving the issue.

    ### GitHub Issue Details:
        - Issue: ${githubIssue}
    
    ### Codebase Information:
        - Repo Source Map: ${sourceMap}
        - Research: ${research}
    
    ### Task:
        1. Understand the GitHub issue and its requirements.
        2. Analyze the codebase source map to identify the relevant files.
        3. Review the gathered research to determine any specific files mentioned.
        4. Identify the remaining files that need to be modified or created to address the issue.
        5. Provide a concise, detailed list of the file paths and descriptions for each file.
    
    ### Important:
        - Ensure that the identified files are directly related to the remaining work to be done to address the GitHub issue.
        - List the full file paths for each file, including the directory structure.
        - Provide a concise, one-sentence description of why each file needs to be modified or created.
        - It is critically important that any files that need modification are included in the list.
        - Double-check that all necessary files are accounted for in the list.`;

  const response = await sendSelfConsistencyChainOfThoughtGptRequest(
    userPrompt,
    systemPrompt,
    0.2,
    undefined,
    3,
    60000,
    null,
  );
  return response ?? "No files found";
};

export const createPlan = async function (
  githubIssue: string,
  sourceMap: string,
  research: string,
  codePatch: string,
  buildErrors: string,
): Promise<Plan | undefined> {
  const hasExistingPlan = codePatch?.length || buildErrors?.length;
  // If there was a previous plan, we need the new plan to reflect the changes made in the code patch
  // First, find all of the files that need to be modified or created
  const files = !hasExistingPlan
    ? await findFiles(githubIssue, sourceMap, research)
    : "";
  // To get the best possible plan, we run the request multiple times with various models at varying temps, and choose the most comprehensive response (as measured naively by the number of tool calls and length of arguments)
  const models: Model[] = ["gpt-4-0125-preview", "gpt-4o-2024-05-13"];
  // const models: Model[] = [
  //   "claude-3-5-sonnet-20240620",
  //   "claude-3-5-sonnet-20240620",
  // ];
  const { userPrompt, systemPrompt } =
    codePatch?.length || buildErrors
      ? getPromptsForUpdatedPlan(codePatch, buildErrors)
      : getPromptsForNewPlan(githubIssue, sourceMap, research, files);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
  const responses = await Promise.all(
    models.flatMap((model) =>
      [1, 2].map((_, index) => {
        // sendGptToolRequest(
        //   userPrompt,
        //   systemPrompt,
        //   planningTools,
        //   index === 1 ? 0.4 : 0.3,
        //   undefined,
        //   3,
        //   60000,
        //   model,
        //   "required",
        //   true,
        // ),
        console.log(`\n +++ Calling ${model} for plan...`);
        return openai.chat.completions.create({
          model,
          messages,
          temperature: index === 1 ? 0.4 : 0.3,
          tools: planningTools,
          tool_choice: "required",
          parallel_tool_calls: true,
          max_tokens: MAX_OUTPUT[model],
        });
      }),
    ),
  );
  console.log(
    "\n\n\n<all responses>\n\n\n",
    responses.map(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (r) =>
        JSON.stringify(r.choices[0]?.message?.tool_calls) ?? "No message found",
    ),
  );
  const plans: Plan[] = responses.map((response) => {
    const toolCalls = response.choices[0]?.message.tool_calls;
    if (!toolCalls) {
      console.error("No tool calls found in response.");
      return { steps: [] };
    }

    const plan: Plan = {
      steps: [],
    };

    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name as PlanningAgentActionType;
      if (!Object.values(PlanningAgentActionType).includes(functionName)) {
        console.error(`Invalid function name: ${functionName}`);
        continue;
      }
      const args = JSON.parse(toolCall.function.arguments) as PlanStep;

      const { title, filePath, instructions, exitCriteria, dependencies } =
        args;
      const step = {
        type: functionName,
        title,
        instructions,
        filePath,
        exitCriteria,
        dependencies,
      };
      plan.steps.push(step);
    }
    return plan;
  });

  const bestPlan = await getBestPlan(plans, userPrompt, systemPrompt);
  console.log("<best plan>\n\n", JSON.stringify(bestPlan));
  console.log("\n\n</best plan>");
  return bestPlan;
};

const getPromptsForNewPlan = (
  githubIssue: string,
  sourceMap: string,
  research: string,
  files: string,
) => {
  // Now create a plan to address the issue based on the identified files
  const systemPrompt = `You are an advanced AI coding assistant designed to efficiently analyze GitHub issues and create detailed plans for resolving them. Your role is to thoroughly understand the provided GitHub issue, codebase source map, and previously gathered research to determine the necessary steps for addressing the issue.

    Key Responsibilities:
        1. Review the provided list of files to modify or create based on the GitHub issue. Each step should include detailed instructions on how to modify or create one or more of the specific files from the code respository.
        2. Comprehend the GitHub issue and its requirements, identifying the goal and what needs to be achieved.
        3. Assess the available information, including the codebase, external resources, and previous research.
        4. Break down the issue into smaller, manageable tasks that align with how a developer would approach the problem.
        5. Review each of the files listed within the <files> tags and determine which changes need to be made to each file. You MUST provide at least one change per file, and at least one file per step!
        6. Create a detailed, step-by-step plan for making the necessary changes to the codebase:
            - Clearly specify the full path of the file to be edited or created.
            - Provide precise instructions on the changes to be made within each file.
            - Ensure there is at least one file modified per step.
            - Include any necessary imports or function calls.
            - Identify dependencies and specify the order in which the changes should be made.
        7. Identify the dependencies between the files and ensure that the plan reflects the correct order of changes.
        8. Output the plan as an ordered array of tools with detailed properties highlighting the instructions, file path, and exit criteria for each step.
    
    Guidelines:
        - Approach the task from the perspective of an experienced developer working on the codebase.
        - Utilize the provided research and codebase information to make informed decisions.
        - Ensure that the plan is clear, concise, and easy to follow.
        - Use proper formatting and syntax when specifying the file path, code snippets, or commands.
        - Follow existing coding conventions and styles when making changes to the codebase. For example, if the system is using TypeScript, ensure that all new code is strictly typed correctly. Or if the codebase uses Tailwind CSS, do not introduce new CSS classes or frameworks.
        - Be sure to take into account any changes that may impact other parts of the codebase, such as functions that call or depend on the modified code.
        - Provide strict, detailed string typing (if needed) and ensure consistency with the existing codebase.
        - Consider edge cases, error handling, and potential impact on existing functionality.
        - Break down complex changes into multiple, focused steps.
        - Double-check that all necessary files and changes are accounted for in the plan.
    
    Remember, your goal is to create a comprehensive, actionable plan that enables the efficient resolution of the GitHub issue. Your plan should be detailed enough for another developer to follow and implement successfully.`;

  const userPrompt = `You are an AI coding assistant tasked with creating a detailed plan for addressing a specific GitHub issue within a codebase. Your goal is to analyze the provided information and develop a step-by-step guide for making the necessary changes to resolve the issue.
  
    ### GitHub Issue Details:
      - Issue: <github_issue>${githubIssue}</github_issue>
  
    ### Code Repository Information:
        ${research?.length ? `- Research: <research>${research}</research>` : ""}
        - Repo Source Map: <source_map>${sourceMap}</source_map>
        - Files to Modify or Create: <files>${files}</files>
    
    ### Task:
        1. Understand the Problem:
            - Thoroughly review the GitHub issue and identify the core problem to be solved.
            - Break down the issue into smaller, manageable tasks.
    
        2. Assess Available Information:
            - Analyze the provided codebase source map to understand the structure and relevant files.
            - Review the gathered research to identify any relevant code snippets, functions, or dependencies.
    
        3. Review Exit Criteria:
            - Analyze the exit criteria specified in the GitHub issue to understand the expected outcomes. If no exit criteria are provided, create measurable criteria for each file modification or creation.
            - Ensure that the changes made to the codebase align with the exit criteria. Each step of the plan should check off one or more exit criteria.
            - Ensure that no exit criteria are missed or overlooked during the planning process.
        
        4. Plan Code Changes:
            - Use the list of specific files that need to be modified or created to address the issue.
            - For each plan step, follow these guidelines:
                - Specify the exact file path in the filePath tool output.
                - Provide clear, detailed instructions on the changes to be made.
                - Include any necessary code snippets, imports, or function calls.
                - Minimize the number of files that are modified per step.
            - Outline the order in which the changes should be made.
    
        5. Finalize the Plan:
            - Review the plan to ensure all necessary changes are accounted for.
            - Ensure that no files are missed or incorrectly included.
            - Determine dependencies between files and use this information to specify the order of changes.
    
    ### Important:
        - Use the following tools to create your plan:
            - EditExistingCode: Modify one existing file in the codebase.
            - CreateNewCode: Create a new file in the codebase.
        - Each tool should be used with specific instructions and file paths.
        - Ensure that the plan is clear, detailed, and follows the guidelines provided.
        - Create the shortest plan possible that addresses all necessary changes. Avoid unnecessary steps or complexity.
    
    Develop a comprehensive plan that outlines the necessary code changes to resolve the GitHub issue effectively. Your plan should be concise, specific, actionable, and easy for another developer to follow and implement.  
    Remember to leverage the provided file list, codebase information and research to make informed decisions and create a plan that effectively addresses the GitHub issue. Double-check your plan for completeness and clarity before submitting it.`;

  return { systemPrompt, userPrompt };
};

const getPromptsForUpdatedPlan = (codePatch: string, buildErrors: string) => {
  // Now create a plan to address the issue based on the identified files
  const systemPrompt = `You are an AI code review assistant specializing in identifying and resolving issues that arise from sequential code changes. Your task is to analyze a given code patch and create a concise plan to address any inconsistencies or errors that may have been introduced due to the order of changes. Focus only on critical issues that affect the functionality or integrity of the code.

Key Responsibilities:
1. Analyze the provided code patch carefully.
2. Review the output of the build process to identify any errors or inconsistencies.
3. Identify any inconsistencies, missing dependencies, or errors that may have been introduced due to the order of changes.
4. Identify each file that has issues and create one step per file to address the critical issues as efficiently as possible.
4. Create a brief, focused plan to resolve only the critical issues found.
5. Ensure that your plan addresses dependencies between files and maintains code integrity.

Guidelines:
- Only include steps to fix critical issues. Minor stylistic or non-functional changes should be ignored.
- It is critically important to include ALL fixes for a one file in a single step in your plan.
- Provide context for each change, explaining why it's necessary.
- If no critical issues are found, it's acceptable to state that no further changes are needed.
- Prioritize changes that affect functionality, imports, or component props.
- Keep your plan concise and actionable.`;

  const userPrompt = `Review the following code patch and build errors, and create a focused plan to address any critical issues that may have been introduced due to the sequential nature of the changes. Pay special attention to:

1. Missing or incorrect imports
2. Changes in component props that aren't reflected in all relevant files
3. New variables or functions that may need to be added to earlier files
4. Any other dependencies between files that may have been overlooked
5. Major type errors or syntax issues

Code Patch:
<code_patch>
${codePatch}
</code_patch>

Build Errors:
<build_errors>
${buildErrors}
</build_errors>

Your task:
1. Analyze the code patch thoroughly.
2. Identify any critical issues that need to be addressed.
3. Create a concise plan to fix these issues, using the following format for each file that needs changes:

   - Title: [Brief description of the change]
   - File Path: [Full path to the file - only change one file at a time]
   - Instructions: [Detailed description of all of the changes needed for fix the errors for this file.]
   - Exit Criteria: [Brief explanation of the expected outcome after the change is made]

If no critical issues are found, simply state "No critical issues identified. No further changes are needed."

Remember, focus only on changes that are necessary to maintain the functionality and integrity of the code. Do not suggest minor improvements or stylistic changes.
    
    ### Important:
        - Use the following tools to create your plan:
            - EditExistingCode: Modify an existing file in the codebase. This is the primary tool for most changes.
            - CreateNewCode: Create a new file in the codebase. It is very rare to need this tool.
        - Each tool should be used with specific instructions and file paths.
        - Ensure that the plan is clear, detailed, and follows the guidelines provided.
        - The number of steps in the plan should match the number of files that need changes.
        - Create the shortest plan possible that addresses all necessary changes. Avoid unnecessary steps or complexity.`;

  return { systemPrompt, userPrompt };
};

const getBestPlan = async (
  plans: Plan[],
  userPrompt: string,
  systemPrompt: string,
): Promise<Plan | undefined> => {
  if (plans.length === 0) {
    throw new Error("No plans provided");
  }

  const evaluationPromises = plans.map(async (plan) => {
    const planString = JSON.stringify(plan);
    const evaluations = await evaluate(
      planString,
      userPrompt,
      systemPrompt,
      undefined,
    );
    const averageRating =
      evaluations.reduce(
        (sum, evaluation) => sum + (evaluation.rating ?? 0),
        0,
      ) / evaluations.length;
    return { plan, evaluations, averageRating };
  });

  const evaluatedPlans = await Promise.all(evaluationPromises);

  const bestEvaluatedPlan = evaluatedPlans.reduce((best, current) => {
    return current.averageRating > best.averageRating ? current : best;
  });

  console.log(`Best plan average rating: ${bestEvaluatedPlan.averageRating}`);
  console.log("Best plan evaluations:");
  bestEvaluatedPlan.evaluations.forEach((evaluation, index) => {
    console.log(`Evaluation ${index + 1}:`);
    console.log(`Summary: ${evaluation.summary}`);
    console.log(`Rating: ${evaluation.rating}`);
  });

  return bestEvaluatedPlan.plan;
};
/*
Notes:
- Use a diff format to generate faster/cheaper responses, then do a separate call with the diff + original code to get the new code.

### LLM Diff Format Rules

The LLM Diff Format is designed to be simple, concise, and easy for an LLM to interpret and apply changes to a code file. It builds on traditional diff formats but includes specific line numbers for context to ensure clarity without requiring the LLM to count lines.

### Format Rules

1. **File Header**:
   - Indicate the file being modified.
   - Prefixed with `---` for the original file path and `+++` for the new file path.
   - Format: `--- <original file path>` and `+++ <new file path>`

2. **Chunk Header**:
   - Each chunk of changes should begin with a line starting with "@@".
   - Followed by `-<original start line>` and `+<new start line>`, separated by a space.
   - Format: `@@ -<line number> +<line number> @@`

3. **Line Changes**:
   - Lines removed from the original file should start with a "-" character.
   - Lines added to the new file should start with a "+" character.
   - Unchanged lines should start with a space character and provide context.

4. **Context Lines**:
   - Include at least 5 lines of context before and after the changes to help locate the modifications in the file.
   - If fewer than 5 lines are available before or after the change, include all available lines.

### Example Outline

```plaintext
--- <original file path>
+++ <new file path>
@@ -<line number> +<line number> @@
 context line 1
 context line 2
 context line 3
 context line 4
 context line 5
- removed line
+ added line
 context line 6
 context line 7
 context line 8
 context line 9
 context line 10
```

### Reasoning

1. **Simplicity**:
   - The format is straightforward, using familiar diff conventions while including explicit line numbers to ensure clarity.

2. **Context**:
   - Providing sufficient context lines helps the LLM locate the modifications within the file easily.

3. **Clarity**:
   - Explicit line numbers and a clear distinction between added and removed lines reduce the chance of errors during interpretation.

### Example for `Chat.tsx`

#### Original Code (with Line Numbers)

```plaintext
1| import { faArrowDown } from "@fortawesome/free-solid-svg-icons";
2| import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
3| import { type FC } from "react";
4| import { type Message } from "~/types";
5| import { ChatInput } from "./ChatInput";
6| import { ChatLoader } from "./ChatLoader";
7| import { ChatMessage } from "./ChatMessage";
8| 
9| interface Props {
10|  messages: Message[];
11|  loading: boolean;
12|  onSend: (message: Message) => void;
13|  onReset: () => void;
14|  onCreateNewTask: (messages: Message[]) => void;
15|  onUpdateIssue: (messages: Message[]) => void;
16|  isResponding?: boolean;
17|  shouldHideLogo?: boolean;
18|  messagesEndRef: React.RefObject<HTMLDivElement>;
19|  sidebarRef: React.RefObject<HTMLDivElement>;
20|  checkIfAtBottom: () => void;
21|  scrollToBottom: () => void;
22|  isAtBottom: boolean;
23| }
24| 
25| export const Chat: FC<Props> = ({
26|  messages,
27|  loading,
28|  onSend,
29|  onCreateNewTask,
30|  onUpdateIssue,
31|  isResponding = false,
32|  messagesEndRef,
33|  sidebarRef,
34|  checkIfAtBottom,
35|  scrollToBottom,
36|  isAtBottom,
37| }) => (
38|  <div
39|    className="space-between flex flex-col rounded-lg px-2 pb-8 sm:p-4"
40|    style={{ height: "calc(100vh - 6rem)" }}
41|  >
42|    <div
43|      className="hide-scrollbar flex flex-1 flex-col overflow-y-auto"
44|      ref={sidebarRef}
45|      onScroll={checkIfAtBottom}
46|    >
47|      {messages.map((message, index) => (
48|        <div key={index} className="my-1 sm:my-2">
49|          <ChatMessage
50|            messageHistory={messages}
51|            message={message}
52|            onCreateNewTask={onCreateNewTask}
53|            onUpdateIssue={onUpdateIssue}
54|            loading={loading}
55|          />
56|        </div>
57|      ))}
58| 
59|      {loading && (
60|        <div className="my-1 sm:my-1.5">
61|          <ChatLoader />
62|        </div>
63|      )}
64|      <div ref={messagesEndRef} />
65|    </div>
66| 
67|    <div className="relative left-0 mt-3 w-full sm:mt-6">
68|      <ChatInput
69|        onSend={onSend}
70|        isResponding={isResponding}
71|        loading={loading}
72|      />
73|      {!isAtBottom && (
74|        <div
75|          className="absolute left-1/2 top-0 -my-14 flex h-10 w-10 -translate-x-1/2 transform cursor-pointer items-center justify-center rounded-full border border-gray-300 bg-white bg-opacity-80  transition duration-300 ease-in-out hover:bg-opacity-100"
76|          onClick={scrollToBottom}
77|        >
78|          <FontAwesomeIcon icon={faArrowDown} size="2x" />
79|        </div>
80|      )}
81|    </div>
82|  </div>
83| );
```

### LLM Diff for Adding Upload Button to `Chat.tsx`

```plaintext
--- src/app/dashboard/[org]/[repo]/[developer]/components/chat/Chat.tsx
+++ src/app/dashboard/[org]/[repo]/[developer]/components/chat/Chat.tsx
@@ -1 +1 @@
 import { faArrowDown } from "@fortawesome/free-solid-svg-icons";
 import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
 import { type FC } from "react";
 import { type Message } from "~/types";
 import { ChatInput } from "./ChatInput";
+import { faUpload } from "@fortawesome/free-solid-svg-icons"; // Import the upload icon
 import { ChatLoader } from "./ChatLoader";
 import { ChatMessage } from "./ChatMessage";

@@ -21 +26 @@
  scrollToBottom: () => void;
  isAtBottom: boolean;
 }
 
+const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
+  const files = event.target.files;
+  if (!files) return;
+  // Validate and process the selected files here...
+};

 export const Chat: FC<Props> = ({
  messages,
  loading,
  onSend,

@@ -63 +74 @@
  </div>
 
 <div className="relative left-0 mt-3 w-full sm:mt-6 flex items-center">
+  <div className="mr-2">
+    <input
+      type="file"
+      accept="image/png, image/jpeg"
+      multiple
+      onChange={handleFileSelect}
+      className="hidden"
+      id="file-upload"
+    />
+    <label htmlFor="file-upload" className="cursor-pointer">
+      <FontAwesomeIcon icon={faUpload} size="2x" />
+    </label>
+  </div>
   <ChatInput
     onSend={onSend}
     isResponding={isResponding}
     loading={loading}
```
*/

/*
Notes:
Here is an example of the core planning algorithm prompt

You are an AI coding assistant tasked with addressing a specific GitHub issue for a codebase. Here are the details you need to consider:

1. **Instructions**: {instructions}
2. **Exit Criteria**: {exitCriteria}
3. **Codebase Information**: {codebaseInfo}
4. **External Information**: {externalInfo}
5. **Clarifications from the Project Owner**: {clarifications}

### Task:
Generate a detailed, step-by-step plan to address the GitHub issue. Each step should include:
- The specific action to be taken (e.g., create new code, edit existing code, find and replace).
- The reason for the action.
- Dependencies on other steps.
- Expected outcomes.

### Constraints:
- Ensure the plan satisfies all exit criteria.
- Minimize changes to existing code unless necessary.
- Maintain code quality and follow best practices.
- Document any assumptions or additional information needed.

### Format:
Return the plan as a JSON array of objects. Each object should have the following structure:
- "step": [A brief description of the step]
- "action": [The action to be taken]
- "reason": [Why this action is necessary]
- "dependencies": [Any dependencies on other steps]
- "expected_outcome": [The expected result of this step]

### Example:
[
    {
        "step": "Initialize new feature branch",
        "action": "Create a new branch from the main branch",
        "reason": "To isolate changes from the main codebase",
        "dependencies": [],
        "expected_outcome": "A new feature branch is created"
    },
    {
        "step": "Implement function to handle user input",
        "action": "CreateNewCode",
        "reason": "Add functionality to process user input as per the new feature",
        "dependencies": ["Initialize new feature branch"],
        "expected_outcome": "A new function is added to handle user input"
    }
]


*/

/*
Code to add/remove line numbers (update this to remove side effects of reading/writing files):

```typescript
import * as fs from 'fs';
import * as path from 'path';

type Callback = (error: NodeJS.ErrnoException | null) => void;


export const addLineNumbers = async (filePath: string): Promise<string> => {
    const fileContents = await fs.promises.readFile(filePath, 'utf-8');
    const lines = fileContents.split('\n');
    const numberedLines = lines.map((line, index) => `${index + 1}| ${line}`);
    return numberedLines.join('\n');
  };
  

  export const removeLineNumbers = async (
    numberedContent: string,
    outputPath: string
  ): Promise<void> => {
    const lines = numberedContent.split('\n');
    const originalLines = lines.map(line => line.replace(/^\d+\|\s/, ''));
    const originalContent = originalLines.join('\n');
    await fs.promises.writeFile(outputPath, originalContent, 'utf-8');
  };
*/

/*
sample code for core engine loop:
import { CreateNewCode, EditExistingCode, FindAndReplace, ResearchCodebase, ResearchInternet, AskProjectOwner, BuildCodebase, TestCodebase, Commit, CreatePR } from './tools';

class AICodingAgent {
    private sourceMap: any;
    private pastActions: any[];

    constructor() {
        this.sourceMap = null;
        this.pastActions = [];
    }

    async handleGitHubIssue(issue: any) {
        const { instructions, exitCriteria } = this.parseIssue(issue);

        // Research and gather information
        const codebaseInfo = await this.researchCodebase('repo-name');
        const externalInfo = await this.researchInternet(instructions);
        const clarifications = await this.askProjectOwner('Any clarifications needed');

        // Plan and execute loop
        let plan = await this.planActions(instructions, codebaseInfo, externalInfo, clarifications);
        while (!this.checkExitCriteria(exitCriteria)) {
            for (let action of plan) {
                await this.executeAction(action);
            }

            // Re-evaluate and re-plan if necessary
            const evaluation = await this.evaluateActions();
            if (!this.checkExitCriteria(exitCriteria)) {
                plan = await this.adjustPlan(plan, evaluation);
            }
        }

        // Finalize the process
        await this.finalizeChanges();
    }

    parseIssue(issue: any): { instructions: string, exitCriteria: string[] } {
        // Extract instructions and exit criteria from the issue
        return {
            instructions: issue.instructions,
            exitCriteria: issue.exitCriteria
        };
    }

    async researchCodebase(repoName: string) {
        // Use Research Codebase tool
        return await ResearchCodebase(repoName);
    }

    async researchInternet(instructions: string) {
        // Use Research Internet tool
        return await ResearchInternet(instructions);
    }

    async askProjectOwner(question: string) {
        // Use Ask Project Owner tool
        return await AskProjectOwner(question);
    }

    async planActions(instructions: string, codebaseInfo: any, externalInfo: any, clarifications: any) {
        // Generate a plan of actions based on gathered information
        const prompt = `
        Instructions: ${instructions}
        Codebase Information: ${JSON.stringify(codebaseInfo)}
        External Information: ${JSON.stringify(externalInfo)}
        Clarifications: ${clarifications}
        
        Based on the above information, generate a detailed step-by-step plan to address the issue, including creating new files, editing existing files, and making necessary code changes.
        `;

        const plan = await LLM.generate(prompt);
        return JSON.parse(plan);
    }

    async executeAction(action: any) {
        switch (action.type) {
            case 'CreateNewCode':
                await CreateNewCode(action.details);
                break;
            case 'EditExistingCode':
                await EditExistingCode(action.filePath, action.details);
                break;
            case 'FindAndReplace':
                await FindAndReplace(action.find, action.replace, action.filePath);
                break;
            // Add more cases for different action types...
        }

        // Log the action for future reference
        this.pastActions.push(action);
    }

    async evaluateActions() {
        // Evaluate the results of the actions
        const buildStatus = await this.buildCodebase();
        const testStatus = await this.testCodebase();
        return { buildStatus, testStatus };
    }

    async adjustPlan(plan: any, evaluation: any) {
        // Adjust the plan based on the evaluation results
        const prompt = `
        Current Plan: ${JSON.stringify(plan)}
        Evaluation: ${JSON.stringify(evaluation)}
        
        Based on the above evaluation, adjust the plan to better meet the exit criteria and ensure successful completion of the task.
        `;
        const adjustedPlan = await LLM.generate(prompt);
        return JSON.parse(adjustedPlan);
    }

    async buildCodebase() {
        return await BuildCodebase();
    }

    async testCodebase() {
        return await TestCodebase();
    }

    checkExitCriteria(exitCriteria: string[]): boolean {
        // Check if all exit criteria are satisfied
        // This function needs to be implemented based on your specific criteria
        return true;
    }

    async finalizeChanges() {
        await this.commitChanges();
        await this.createPullRequest();
    }

    async commitChanges() {
        return await Commit();
    }

    async createPullRequest() {
        return await CreatePR();
    }
}
From: https://chatgpt.com/c/bbee7178-4b04-402b-8f74-bd21cfd64a18
*/
