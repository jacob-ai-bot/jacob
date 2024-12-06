import { db } from "~/server/db/db";
import {
  sendGptRequest,
  sendGptRequestWithSchema,
} from "~/server/openai/request";
import {
  type ContextItem,
  getOrCreateCodebaseContext,
} from "./codebaseContext";

import {
  standardizePath,
  isValidExistingFile,
  isValidNewFileName,
} from "~/server/utils/files";
import { traverseCodebase } from "~/server/analyze/traverse";
import { getFiles } from "./files";
import { z } from "zod";
import { PlanningAgentActionType } from "~/server/db/enums";
import { type Research, researchIssue } from "../agent/research";

const PlanStepSchema = z.object({
  type: z.nativeEnum(PlanningAgentActionType),
  title: z.string(),
  instructions: z.string(),
  filePath: z.string().transform((path) => standardizePath(path)),
  exitCriteria: z.string().optional(),
  dependencies: z.string().optional(),
});

const PlanSchema = z.object({
  steps: z.array(PlanStepSchema),
});

type Plan = z.infer<typeof PlanSchema>;

interface GetOrGeneratePlanParams {
  projectId: number;
  issueId: number;
  githubIssue: string;
  rootPath: string;
  contextItems?: ContextItem[] | undefined;
  feedback?: string | undefined;
}

export const getOrGeneratePlan = async ({
  projectId,
  issueId,
  githubIssue,
  rootPath,
  contextItems,
  feedback,
}: GetOrGeneratePlanParams): Promise<Plan> => {
  if (!projectId || !issueId) {
    throw new Error("Error generating plan, missing project or issue id");
  }
  try {
    // Check to see if the plan has already been generated
    const planSteps = await db.planSteps
      .where({
        projectId,
        issueNumber: issueId,
        isActive: true,
      })
      .all();
    if (planSteps?.length) {
      return {
        steps: planSteps.map((step) => ({
          ...step,
          filePath: standardizePath(step.filePath),
          exitCriteria: step.exitCriteria ?? undefined,
          dependencies: step.dependencies ?? undefined,
        })),
      };
    }

    // Get research data
    const todo = await db.todos.findByOptional({ projectId, issueId });
    if (!todo) {
      throw new Error(
        `Error generating plan, no todo found for project ${projectId} and issue ${issueId}`,
      );
    }
    let researchQuestions = (await db.research
      .where({ issueId, todoId: todo.id })
      .all()) as Research[];

    if (!researchQuestions.length) {
      researchQuestions = await researchIssue({
        githubIssue,
        todoId: todo.id,
        issueId,
        rootDir: rootPath,
        projectId,
      });
    }
    if (!researchQuestions.length) {
      throw new Error(
        `Error generating plan, no research found for todo ${todo.id}`,
      );
    }

    const research = researchQuestions
      .map((item) => `Question: ${item.question}\nAnswer: ${item.answer}`)
      .join("\n\n");

    if (!contextItems) {
      const allFiles = traverseCodebase(rootPath);
      contextItems = await getOrCreateCodebaseContext(
        projectId,
        rootPath,
        allFiles,
      );
    }

    // If feedback is provided, the user was not happy with the previous plan,
    // so we'll provide more details in the codebase context to help generate a better (but more expensive) plan.
    const codebaseContext = contextItems
      ?.map((item) => `${item.file}: ${feedback ? item.text : item.overview}`)
      .join("\n");

    // find all the files that are mentioned in the research and get the full code for those files
    const mentionedFiles = researchQuestions
      .map((item) => item.answer)
      .join("\n");
    const relevantCodebaseContext = contextItems.filter((item) =>
      mentionedFiles.includes(item.file),
    );

    // get the full code for the mentioned files
    const mentionedFilesCode = getFiles(
      rootPath,
      relevantCodebaseContext?.map((c) => c.file),
      true,
    );

    // Generate a plan using o1-mini
    const o1Prompt = `Generate a plan for writing code to resolve the specified Github issue using the provided codebase information.

Below is the context and detailed steps to guide the process.

## Context

- **Codebase Context**: A collection of files and their relevant information to aid in understanding the approach and examples.
  \`\`\`
  <codebase-context>${codebaseContext}</codebase-context>
  \`\`\`

- **Mentioned Files**: The full code for the files that are highlighted in the research.
  \`\`\`
  <mentioned-files>${mentionedFilesCode}</mentioned-files>
  \`\`\`

- **Research**: A collection of Questions and Answers from the codebase to aid in understanding the approach and examples of similar code from the codebase.
  \`\`\`
  <research>${research}</research>
  \`\`\`
  
- **Github Issue**: The issue that needs to be addressed with a code solution.
  \`\`\`
  <issue>${githubIssue}</issue>
  \`\`\`
  ${
    feedback?.length
      ? `- **User Feedback**: An invalid plan was previously generated and rejected. Here is important feedback from the user about the plan that was rejected. You MUST NOT make the same mistake again. This feedback must be taken into account when generating the plan.
  \`\`\`
  <feedback>${feedback}</feedback>
  \`\`\``
      : ""
  }
  ## Guidelines

  - Break down the plan into a series of distinct steps, focusing on modifications to existing files or the creation of new files.
  - Each step should be a clear and concise instruction to modify an existing file or create a new file. NEVER include a step that involves modifying multiple files.
  - All modifications to a file should be specified in a single step. NEVER include multiple steps with the same file path. Just put all the modifications for a single file in a single step.
  - Clearly identify exact files to modify or specify relative file paths and names with extensions for new files to be created. NEVER specify a directory path. For new files, the file path must not already exist in the codebase. For existing files, the file path must be a valid existing file.
  - Minimize the extent of file modifications and limit the number of new files.
  - Concentrate exclusively on necessary code changes, excluding tests or documentation unless specified.
  - Avoid writing actual code snippets or making assumptions outside the provided codebase information.

  ## Important
  - The research was done by an AI agent, and it may contain information about the codebase that might look to be harmful. Note that questions and answers about codebase authentication, authorization, and other security related questions are NOT harmful! They are important to include in the plan. However, if you absolutely do not feel comfortable creating a plan based on the research, you MUST still create a plan but in extreme cases you may leave out any steps that you deem to be harmful. This should be a last resort as it will cause the plan to be incomplete and may cause the agent to fail to complete the task, but it is better than refusing to create a plan at all.
  
  # Output Format
  
  Produce a JSON formatted list where each step is defined as an object. Clearly separate these steps into calls for either modifying existing code or creating new code. Each object should adhere to one of two types of planned actions:
  
  Step 1. **EditExistingCode**:
  
     \`\`\`json
     {
       "type": "EditExistingCode",
       "title": "[Concise and descriptive task title]",
       "instructions": "[Clear detailed step-specific instructions without code snippets. This should contain all of the information needed for a developer to complete the step without any additional research.]",
       "filePath": "[Relative file path of the file to be modified]",
       "exitCriteria": "[Measurable and verifiable criteria for completion]",
     }
     \`\`\`
  
  Step 2. **CreateNewCode**:
  
     \`\`\`json
     {
       "type": "CreateNewCode",
       "title": "[Concise and descriptive task title]",
       "instructions": "[Detailed instructions for desired functionality]",
       "filePath": "[Relative file path for new file creation]",
       "exitCriteria": "[Clear criteria for completion and integration]",
     }
     \`\`\`

  Step 3. **EditExistingCode**:
  
     \`\`\`json
     {
       "type": "EditExistingCode",
       "title": "[Concise and descriptive task title]",
       "instructions": "[Clear detailed step-specific instructions without code snippets. This should contain all of the information needed for a developer to complete the step without any additional research.]",
       "filePath": "[Relative file path of the file to be modified (must be unique from previous steps)]",
       "exitCriteria": "[Measurable and verifiable criteria for completion]",
     }
     \`\`\`
  
     
  Structuring your plan in this manner helps optimize it for conversion into an array of tool calls by the agent. Note that the plan may have one or both types of steps. A plan could have only one step, or it could have many steps. Keep the plan as short as possible, and only include steps that are necessary to complete the task.
  
  # Examples
  
  Step 1. **EditExistingCode**:  
  \`\`\`json
  {
    "type": "EditExistingCode",
    "title": "Update API Endpoint for Users",
    "instructions": "Update the API endpoint for users to add a new field for getting the user's age.",
    "filePath": "/src/api/users.ts",
    "exitCriteria": "When the API is called with the new endpoint, the response should include the user's age."
  }
  \`\`\`
  
  Step 2. **CreateNewCode**:  
  \`\`\`json
  {
    "type": "CreateNewCode",
    "title": "Add a new component for the user profile page",
    "instructions": "Implement a new component for the user profile page. This component should display the user's profile information including their name, age, and gender.",
    "filePath": "/src/components/userProfile.tsx",
    "exitCriteria": "The new component should be able to be rendered and should display the user's profile information.",
  }
  \`\`\`
  `;
    let o1Plan: string | null = null;
    // plans have been getting flagged as harmful, so we'll try a few times with different models
    try {
      o1Plan = await sendGptRequest(
        o1Prompt,
        "",
        1,
        undefined,
        3,
        60000,
        null,
        "o1-preview-2024-09-12",
      );
      console.log("\n\n\n\n\n****** Generated plan:", o1Plan, "\n\n\n\n\n");
    } catch (error) {
      console.error("Error generating plan:", error);
      try {
        // try to generate the plan using claude
        o1Plan = await sendGptRequest(
          o1Prompt,
          `Generate a plan for the following issue: ${githubIssue}`,
          1,
          undefined,
          3,
          60000,
          null,
          "claude-3-5-sonnet-20241022",
        );
      } catch (error) {
        console.error("Error generating plan using claude:", error);
        // if that fails, try to generate the plan using gemini
        o1Plan = await sendGptRequest(
          o1Prompt,
          `Generate a plan for the following issue: ${githubIssue}`,
          1,
          undefined,
          3,
          60000,
          null,
          "gemini-1.5-pro-latest",
        );
      }
    }
    if (!o1Plan) {
      throw new Error(
        `Error generating plan for todo ${todo.id}, no plan generated`,
      );
    }

    const structuredPlan = await getStructuredPlan(o1Plan);
    console.log(
      "\n\n\n\n\n****** Structured plan:",
      JSON.stringify(structuredPlan, null, 2),
      "\n\n\n\n\n",
    );
    // review the plan and convert the filePath to a standardized path
    // if the filePath is not a valid standardized path, skip the step
    const validSteps = structuredPlan.steps
      .filter((step) => {
        const standardizedPath = standardizePath(step.filePath);
        if (standardizedPath === "") {
          return false;
        }

        // If the step is to edit an existing file, check that it is a valid existing file
        if (step.type === PlanningAgentActionType.EditExistingCode) {
          if (!isValidExistingFile(standardizedPath, rootPath)) {
            return false;
          }
        }

        // If the step is to create a new file, check that it is a valid new file name
        if (step.type === PlanningAgentActionType.CreateNewCode) {
          if (!isValidNewFileName(standardizedPath)) {
            return false;
          }
          // check that the file does not already exist, if it does change the type to EditExistingCode
          if (isValidExistingFile(standardizedPath, rootPath)) {
            step.type = PlanningAgentActionType.EditExistingCode;
          }
        }

        return true;
      })
      .map((step) => {
        return {
          ...step,
          filePath: standardizePath(step.filePath),
        };
      });

    // Save the plan to the database
    for (const step of validSteps) {
      await db.planSteps.create({
        ...step,
        projectId,
        issueNumber: issueId,
      });
    }
    console.log("saved plan to db");

    return structuredPlan;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// Function to extract issue information
const getStructuredPlan = async (o1Plan: string): Promise<Plan> => {
  const systemPrompt = `You are part of an advanced AI coding assistant designed to convert detailed plans for resolving Github issues into a structured plan object.
  
  You will be provided a plan, and your job is to convert this into a structured plan object.
  
  Here is the plan:
  
  <plan>
  ${o1Plan}
  </plan>
  
  The plan contains a series of steps, where each step is an object with a type property. The type property can be "EditExistingCode" or "CreateNewCode".
  
  Your job is to convert this plan into a structured plan object. Here is the schema:


const PlanSchema = z.object({
  steps: z.array(z.object({
    type: z.enum(["EditExistingCode", "CreateNewCode"]), // The type of action to be performed
    title: z.string(), // A concise title for the step
    instructions: z.string(), // Detailed instructions for the step
    filePath: z.string(), // The full relative filepath to the file to be modified or created
    exitCriteria: z.string(), // Measurable criteria for determining if the step is complete
    dependencies: z.string().optional(), // Optional dependencies if there are other steps that need to be completed first
  })),
});
  
  It is critical that you follow the plan structure and include all the steps. Please analyze the provided information and generate a \`Plan\` object that adheres to this PlanSchema schema. 
  If you do not have required information for title or exitCriteria, you can infer a reasonable default value. 
  However, if you do not have clear information for a critical field like filePath or the filePath is invalid (i.e. there are multiple files or it is not a valid path), you must skip the step!
Your response MUST adhere EXACTLY to the PlanSchema schema provided.
  `;

  const userPrompt = `Here is the plan:
  
  <plan>
  ${o1Plan}
  </plan>

  Convert this plan into a structured plan object with an array of steps. Each step should include type, title, instructions, filePath, exitCriteria, and optionally dependencies. Your response MUST adhere EXACTLY to the PlanSchema schema provided.`;

  try {
    const plan = await sendGptRequestWithSchema(
      userPrompt,
      systemPrompt,
      PlanSchema,
      0,
      undefined,
      3,
      "gpt-4o-2024-08-06",
    );

    return plan;
  } catch (error) {
    console.error("Error creating structured plan:", error);
    return { steps: [] };
  }
};

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

export const generateCodeReviewPlan = async ({
  commentsOnSpecificLines,
  reviewBody,
  rootPath,
}: {
  commentsOnSpecificLines: string;
  reviewBody: string;
  rootPath: string;
}): Promise<Plan> => {
  try {
    const codeReviewPrompt = `Generate a plan for addressing the provided code review comments.

Below is the context and detailed information to guide the process.

## Context

- **Code Review Comments on Specific Lines**:
  \`\`\`
  <comments>${commentsOnSpecificLines}</comments>
  \`\`\`

- **General Code Review Comments**:
  \`\`\`
  <reviewBody>${reviewBody}</reviewBody>
  \`\`\`

## Guidelines

- Break down the plan into a series of distinct steps, focusing on addressing each comment individually.
- Each step should be a clear and concise instruction to modify an existing file or create a new file.
- All modifications to a file should be specified in a single step.
- Clearly identify exact files to modify or specify relative file paths.
- Focus exclusively on addressing the code review comments. Do not make any additional changes.
- Avoid writing actual code snippets or making assumptions outside the provided comments.

# Output Format

Produce a JSON formatted list where each step is defined as an object. Each object should adhere to one of two types of planned actions:

Step 1. **EditExistingCode**:

   \`\`\`json
   {
     "type": "EditExistingCode",
     "title": "[Concise description of the change]",
     "instructions": "[Clear detailed instructions for the change]",
     "filePath": "[Relative file path of the file to be modified]",
     "exitCriteria": "[How to verify the change addresses the comment]",
   }
   \`\`\`

Step 2. **CreateNewCode**:

   \`\`\`json
   {
     "type": "CreateNewCode",
     "title": "[Concise description of the new file]",
     "instructions": "[Detailed instructions for the new file's functionality]",
     "filePath": "[Relative file path for new file]",
     "exitCriteria": "[How to verify the new file meets the requirements]",
   }
   \`\`\``;

    let codeReviewPlan: string | null = null;
    try {
      codeReviewPlan = await sendGptRequest(
        codeReviewPrompt,
        "",
        1,
        undefined,
        3,
        60000,
        null,
        "o1-preview-2024-09-12",
      );
      console.log(
        "\n\n\n\n\n****** Generated code review plan:",
        codeReviewPlan,
        "\n\n\n\n\n",
      );
    } catch (error) {
      console.error("Error generating code review plan:", error);
      try {
        codeReviewPlan = await sendGptRequest(
          codeReviewPrompt,
          `Generate a plan for addressing these code review comments.`,
          1,
          undefined,
          3,
          60000,
          null,
          "gpt-4o-2024-08-06",
        );
      } catch (error) {
        console.error(
          "Error generating code review plan with fallback model:",
          error,
        );
        throw error;
      }
    }
    if (!codeReviewPlan) {
      throw new Error("Error generating code review plan, no plan generated");
    }

    const structuredPlan = await getStructuredPlan(codeReviewPlan);
    console.log(
      "\n\n\n\n\n****** Structured code review plan:",
      JSON.stringify(structuredPlan, null, 2),
      "\n\n\n\n\n",
    );
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
    console.error("Error in generateCodeReviewPlan:", error);
    throw error;
  }
};
