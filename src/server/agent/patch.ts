import fs from "fs";
import path from "path";

import { addLineNumbers, removeLineNumbers } from "~/server/utils/files";
import { sendSelfConsistencyChainOfThoughtGptRequest } from "~/server/openai/utils";

interface FileContent {
  fileName: string;
  filePath: string;
  codeBlock: string;
}

export async function applyCodePatchViaLLM(
  rootPath: string,
  filePath: string,
  patch: string,
  isNewFile = false,
  retryCount = 0,
): Promise<FileContent[]> {
  const maxRetries = 3;
  if (retryCount >= maxRetries) {
    console.error(
      `Failed to apply patch to ${filePath} after ${maxRetries} attempts`,
    );
    throw new Error(`Failed to apply patch to ${filePath}`);
  }
  try {
    if (isNewFile) {
      return createNewFile(rootPath, filePath, patch);
    } else {
      return updateExistingFile(rootPath, filePath, patch);
    }
  } catch (error) {
    console.error(`Error applying patch to ${filePath}:`, error);
    return applyCodePatchViaLLM(
      rootPath,
      filePath,
      patch,
      isNewFile,
      retryCount + 1,
    );
  }
}

async function createNewFile(
  rootPath: string,
  filePath: string,
  patch: string,
): Promise<FileContent[]> {
  const files: FileContent[] = [];
  try {
    const fullFilePath = path.join(rootPath, filePath);
    const dirPath = path.dirname(fullFilePath);

    // Prepare the prompt for the LLM
    const userPrompt = `
I want to create a new file with the following patch:

${patch}

Please provide the complete file content based on this patch. Your response should:
1. Include the entire file content, not just the changed parts.
2. Remove any diff-specific syntax (like +, -, @@ lines).
3. Be surrounded by <file_content> tags.
4. Contain no additional commentary, explanations, or code blocks.

Here's an example of how your response should be formatted:

<file_content>
import React from 'react';

function App() {
  return (
    <div>
      <h1>Hello, World!</h1>
    </div>
  );
}

export default App;
</file_content>`;

    const systemPrompt = `You are an expert code creator. Your task is to generate the complete file content based on the given patch for a new file. Make sure to remove any diff-specific syntax and provide only the actual file content. Your response must be the complete file content surrounded by <file_content> tags, with no additional commentary or code blocks.`;

    // Call the LLM to generate the file content
    const rawFileContent = await sendSelfConsistencyChainOfThoughtGptRequest(
      userPrompt,
      systemPrompt,
    );

    if (rawFileContent) {
      // Extract content between <file_content> tags
      const contentMatch = rawFileContent.match(
        /<file_content>([\s\S]*)<\/file_content>/,
      );
      if (contentMatch?.[1]) {
        const fileContent = contentMatch[1].trim();

        // Create directory if it doesn't exist
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }

        // Write the new file
        fs.writeFileSync(fullFilePath, fileContent, "utf-8");
        console.log(`Successfully created new file ${filePath}`);

        files.push({
          fileName: path.basename(filePath),
          filePath,
          codeBlock: fileContent,
        });
      } else {
        throw new Error(
          "LLM response did not contain properly formatted file content",
        );
      }
    } else {
      throw new Error(`Failed to generate content for new file ${filePath}`);
    }
  } catch (error) {
    console.error(`Error creating new file ${filePath}:`, error);
  }

  return files;
}

async function updateExistingFile(
  rootPath: string,
  filePath: string,
  patch: string,
): Promise<FileContent[]> {
  const files: FileContent[] = [];
  try {
    // First, check to see if the file exists
    const fullFilePath = path.join(rootPath, filePath);
    if (!fs.existsSync(fullFilePath)) {
      console.error(`File ${filePath} does not exist`);
      return files;
    }
    // Read the existing file content
    const existingContent = fs.readFileSync(fullFilePath, "utf-8");
    const numberedContent = addLineNumbers(existingContent);

    // Prepare the prompt for the LLM
    const userPrompt = `
I have an existing file with the following content (line numbers added for reference):

${numberedContent}

I want to apply the following patch to this file:

${patch}

Please provide the updated file content after applying the patch. Your response should:
1. Include the entire file content, not just the changed parts.
2. Maintain the original line numbers.
3. Be surrounded by <file_content> tags.
4. Contain no additional commentary, explanations, or code blocks.

Here's an example of how your response should be formatted:

<file_content>
1| import React from 'react';
2| 
3| function App() {
4|   return (
5|     <div>
6|       <h1>Hello, World!</h1>
7|     </div>
8|   );
9| }
10| 
11| export default App;
</file_content>`;

    const systemPrompt = `You are an expert code editor. Your task is to apply the given patch to the existing file content and return the entire updated file content, including line numbers. Make sure to handle line numbers correctly, even if they are inconsistent in the patch. If a hunk in the patch cannot be applied, skip it and continue with the next one. Your response must be the complete file content surrounded by <file_content> tags, with no additional commentary or code blocks.`;

    // Call the LLM to apply the patch
    const rawUpdatedContent = await sendSelfConsistencyChainOfThoughtGptRequest(
      userPrompt,
      systemPrompt,
    );

    if (rawUpdatedContent) {
      // Extract content between <file_content> tags
      const contentMatch = rawUpdatedContent.match(
        /<file_content>([\s\S]*)<\/file_content>/,
      );
      if (contentMatch?.[1]) {
        const numberedUpdatedContent = contentMatch[1].trim();
        const updatedContent = removeLineNumbers(numberedUpdatedContent);

        fs.writeFileSync(fullFilePath, updatedContent, "utf-8");
        console.log(`Successfully updated ${filePath}`);
        files.push({
          fileName: path.basename(filePath),
          filePath,
          codeBlock: updatedContent,
        });
      } else {
        throw new Error(
          "LLM response did not contain properly formatted file content",
        );
      }
    } else {
      throw new Error(`Failed to apply patch to ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }

  return files;
}
