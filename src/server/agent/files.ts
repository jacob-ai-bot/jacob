import { sendSelfConsistencyChainOfThoughtGptRequest } from "~/server/openai/utils";

export const findFiles = async function (
  githubIssue: string,
  context: string,
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
          - Codebase: ${context}
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
