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

    const userPrompt = `
I want to create a new file with the following patch:

${patch}

Please provide the complete file content based on this patch. Your response should:
1. Include the entire file content, not just the changed parts.
2. Remove any diff-specific syntax (like +, -, @@ lines).
3. Be surrounded by <file_content> tags.
4. Contain no additional commentary, explanations, or code blocks.
5. Preserve all comments from the patch, including inline comments, block comments, and documentation comments.

Here's an example of how your response should be formatted:

<file_content>
// This is a comment that should be preserved
import React from 'react';

/**
 * Documentation comment that should be preserved
 */
function App() {
  return (
    <div>
      <h1>Hello, World!</h1> // Inline comment that should be preserved
    </div>
  );
}

export default App;
</file_content>`;

    const systemPrompt = `You are an expert code creator. Your task is to generate the complete file content based on the given patch for a new file. Make sure to:
1. Remove any diff-specific syntax
2. Preserve all comments from the patch, including inline comments, block comments, and documentation comments
3. Provide only the actual file content surrounded by <file_content> tags
4. Include no additional commentary or code blocks`;

    const rawFileContent = await sendSelfConsistencyChainOfThoughtGptRequest(
      userPrompt,
      systemPrompt,
    );

    if (rawFileContent) {
      const contentMatch = rawFileContent.match(
        /<file_content>([\s\S]*)<\/file_content>/,
      );
      if (contentMatch?.[1]) {
        const fileContent = contentMatch[1].trim();

        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }

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
    const fullFilePath = path.join(rootPath, filePath);
    if (!fs.existsSync(fullFilePath)) {
      console.error(`File ${filePath} does not exist`);
      return files;
    }
    const existingContent = fs.readFileSync(fullFilePath, "utf-8");
    const numberedContent = addLineNumbers(existingContent);

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
5. Preserve ALL existing comments from the original file, including inline comments, block comments, and documentation comments.
6. Preserve any new comments from the patch.
7. Never remove or modify existing comments, even if they appear outdated or incorrect.

Here's an example of how your response should be formatted:

<file_content>
1| // This existing comment must be preserved
2| import React from 'react';
3| 
4| /**
5|  * This documentation comment block must be preserved
6|  */
7| function App() {
8|   return (
9|     <div>
10|       <h1>Hello, World!</h1> // This inline comment must be preserved
11|     </div>
12|   );
13| }
14| 
15| export default App;
</file_content>`;

    const systemPrompt = `You are an expert code editor. Your task is to apply the given patch to the existing file content and return the entire updated file content, including line numbers. You must:
1. Handle line numbers correctly, even if they are inconsistent in the patch
2. Skip any patch hunks that cannot be applied and continue with the next one
3. Preserve ALL existing comments from the original file, including inline comments, block comments, and documentation comments
4. Preserve any new comments from the patch
5. Never remove or modify existing comments, even if they appear outdated or incorrect
6. Return the complete file content surrounded by <file_content> tags, with no additional commentary or code blocks`;

    const rawUpdatedContent = await sendSelfConsistencyChainOfThoughtGptRequest(
      userPrompt,
      systemPrompt,
    );

    if (rawUpdatedContent) {
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
