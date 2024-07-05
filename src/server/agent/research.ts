import type OpenAI from "openai";
import dedent from "ts-dedent";
import {
  type Model,
  sendGptRequest,
  sendGptToolRequest,
} from "~/server/openai/request";
import { getCodebase } from "~/server/utils/files";

export enum ResearchAgentActionType {
  ResearchCodebase = "ResearchCodebase",
  ResearchInternet = "ResearchInternet",
  AskProjectOwner = "AskProjectOwner",
  ResearchComplete = "ResearchComplete",
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
  rootDir: string,
  maxLoops = 3,
  model: Model = "gpt-4-0125-preview",
): Promise<string> {
  console.log("Researching issue...");
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
        );
        // messages.push({
        //   role: "function",
        //   name: functionName,
        //   content: functionResponse,
        // });
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
