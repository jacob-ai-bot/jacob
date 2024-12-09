export const generateBugfixPlan = async ({
  githubIssue,
  rootPath,
  code,
  errors,
}: {
  githubIssue: string;
  rootPath: string;
  code: string;
  errors: string[];
}): Promise<Plan> => {
  try {
    const bugfixPrompt = `Generate a plan for fixing the specified errors or type issues in the Pull Request.

Use a chain-of-thought approach to reason through the steps needed to fix the errors.

Below is the context and detailed information to guide the process.

## Context

- **Code**: The code that was modified in the Pull Request.
  \`\`\`
  <code>${code}</code>
  \`\`\`

- **Errors**: The specific errors that need to be fixed.
  \`\`\`
  <errors>${errors.join("\n")}</errors>
  \`\`\`
  
- **Github Issue**: The issue that describes the errors and context.
  \`\`\`
  <issue>${githubIssue}</issue>
  \`\`\`

## Guidelines

- Break down the plan into a series of distinct steps, focusing on fixing the specific errors.
- Each step should be a clear and concise instruction to modify an existing file or create a new file to fix an error.
- All modifications to fix a specific error should be specified in a single step.
- Clearly identify exact files to modify or specify relative file paths.
- Minimize the extent of file modifications and limit the number of new files.
- Focus exclusively on fixing the errors, excluding tests or documentation unless specified. DO NOT make any other changes to the codebase, such as removing comments or fixing other errors.
- DO NOT make any changes to the codebase that are not related to the errors or type issues.
- If there is a type error, note that the AI agent fixing the error will have access to a list of types in the codebase. You do not need to be overly specific about how to fix the type error, just that it should be fixed.
- Never suggest fixing an error by deleting or commenting out the code containing the error! If you don't know how to fix the error, just note that it should be fixed.
- Avoid writing actual code snippets or making assumptions outside the provided codebase information.
- Note that although you have options to edit files and create new files, almost all errors can be fixed by editing existing files. You should very rarely need to create a new file, if ever.

# Output Format

Produce a JSON formatted list where each step is defined as an object. Each object should adhere to one of two types of planned actions:

Step 1. **EditExistingCode**:

   \`\`\`json
   {
     "type": "EditExistingCode",
     "title": "[Concise description of the error fix]",
     "instructions": "[Clear detailed instructions for fixing the error]",
     "filePath": "[Relative file path of the file to be modified]",
     "exitCriteria": "[How to verify the error is fixed]",
   }
   \`\`\`

Step 2. **CreateNewCode**:

   \`\`\`json
   {
     "type": "CreateNewCode", // NOTE: This will rarely be used, but it is here for completeness
     "title": "[Concise description of the new file needed]",
     "instructions": "[Detailed instructions for the new file's functionality]",
     "filePath": "[Relative file path for new file]",
     "exitCriteria": "[How to verify the new file fixes the error]",
   }
   \`\`\``;

    let bugfixPlan: string | null = null;
    try {
      bugfixPlan = await sendGptRequest(
        bugfixPrompt,
        "",
        1,
        undefined,
        3,
        60000,
        null,
        "o1-preview-2024-09-12",
      );
    } catch (error) {
      console.error("Error generating bugfix plan:", error);
      try {
        bugfixPlan = await sendGptRequest(
          bugfixPrompt,
          `Generate a plan for fixing these errors: ${errors.join("\n")}`,
          1,
          undefined,
          3,
          60000,
          null,
          "claude-3-5-sonnet-20241022",
        );
      } catch (error) {
        console.error("Error generating bugfix plan using claude:", error);
        bugfixPlan = await sendGptRequest(
          bugfixPrompt,
          `Generate a plan for fixing these errors: ${errors.join("\n")}`,
          1,
          undefined,
          3,
          60000,
          null,
          "gemini-1.5-pro-latest",
        );
      }
    }

    if (!bugfixPlan) {
      throw new Error("Error generating bugfix plan, no plan generated");
    }

    const structuredPlan = await getStructuredPlan(bugfixPlan);

    const validSteps = structuredPlan.steps
      .filter((step) => {
        const standardizedPath = standardizePath(step.filePath);
        if (standardizedPath === "") {
          return false;
        }

        if (step.type === PlanningAgentActionType.EditExistingCode) {
          if (!isValidExistingFile(standardizedPath, rootPath)) {
            return false;
          }
        }

        if (step.type === PlanningAgentActionType.CreateNewCode) {
          if (!isValidNewFileName(standardizedPath)) {
            return false;
          }
          if (isValidExistingFile(standardizedPath, rootPath)) {
            step.type = PlanningAgentActionType.EditExistingCode;
          }
        }

        return true;
      })
      .map((step) => ({
        ...step,
        filePath: standardizePath(step.filePath),
      }));

    return { steps: validSteps };
  } catch (error) {
    console.error("Error in generateBugfixPlan:", error);
    throw error;
  }
};

/* No further changes needed in this section */
