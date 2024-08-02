import type OpenAI from "openai";
import { sendGptToolRequest, type Model } from "~/server/openai/request";
import { evaluate } from "~/server/openai/utils";
import { PlanningAgentActionType } from "~/server/db/enums";
import { findFiles } from "~/server/agent/files";

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

export const createPlan = async function (
  githubIssue: string,
  context: string,
  research: string,
  codePatch: string,
  buildErrors: string,
): Promise<Plan | undefined> {
  const hasExistingPlan = codePatch?.length || buildErrors?.length;
  // If there was a previous plan, we need the new plan to reflect the changes made in the code patch
  // First, find all of the files that need to be modified or created
  const files = !hasExistingPlan
    ? await findFiles(githubIssue, context, research)
    : "";

  // const models: Model[] = [
  //   "claude-3-5-sonnet-20240620",
  //   "claude-3-5-sonnet-20240620",
  // ];
  console.log("research", research);
  const models: Model[] = ["gpt-4-0125-preview", "gpt-4o-2024-05-13"];
  const { userPrompt, systemPrompt } =
    codePatch?.length || buildErrors
      ? getPromptsForUpdatedPlan(codePatch, buildErrors, githubIssue)
      : getPromptsForNewPlan(githubIssue, context, research, files);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
  console.log("\n\n\n\n\n\n\n\nCreating plans with prompts:");
  console.log("User prompt:", userPrompt);
  console.log("System prompt:", systemPrompt);
  console.log("\n\n\n\n\n\n\n\nCreated plans with prompts:");
  const responses = await Promise.all(
    models.flatMap((model) =>
      [1, 2].map((_, index) =>
        sendGptToolRequest(
          messages,
          planningTools,
          index === 1 ? 0.4 : 0.3,
          undefined,
          3,
          60000,
          model,
          "required",
          true,
        ),
      ),
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
  research: string,
  files: string,
  context: string,
) => {
  console.log("Creating new plan with prompts:");
  console.log("Research:", research);
  // Now create a plan to address the issue based on the identified files
  const systemPrompt = `You are an advanced AI coding assistant designed to efficiently analyze GitHub issues and create detailed plans for resolving them. Your role is to thoroughly understand the provided GitHub issue, codebase source map, and previously gathered research to determine the necessary steps for addressing the issue.
  
      Here are details about the source code for the repository you are working with: <source_map>${context}</source_map>

      Key Responsibilities:
          1. Review the provided list of files to modify or create based on the GitHub issue. Each step should include detailed instructions on how to modify or create one or more of the specific files from the code respository.
          2. Comprehend the GitHub issue and its requirements, identifying the goal and what needs to be achieved.
          3. Assess the available information, including the codebase, external resources, and previous research.
          4. Break down the issue into smaller, manageable tasks that align with how a developer would approach the problem.
          5. Review each of the files listed within the <files> tags and determine which changes need to be made to each file. You MUST provide at least one change per file, and at least one file per step!
          6. Create a detailed, step-by-step plan for making the necessary changes to the codebase:
              - Clearly specify the full path of the file to be edited or created.
              - Provide precise instructions on the changes to be made within each file. You MUST use the research data and/or GitHub issue to inform your instructions. DO NOT make up instructions!
              - Ensure there is at least one file modified per step.
              - Include any necessary imports or function calls.
              - Identify dependencies and specify the order in which the changes should be made.
          7. Identify the dependencies between the files and ensure that the plan reflects the correct order of changes.
          8. Output the plan as an ordered array of tools with detailed properties highlighting the instructions, file path, and exit criteria for each step.
      
      Guidelines:
          - Approach the task from the perspective of an experienced developer working on the codebase.
          - Utilize the provided research and codebase information to make informed decisions.
          - Ensure that the plan is clear, concise, and easy to follow.
          - The instructions are extremely important to the success of the plan. Use the research data and/or GitHub issue to inform your instructions. DO NOT make up instructions! If you do not have specific instructions you can be very general, but you MUST use the research data and/or GitHub issue to inform your instructions. NEVER make up specific instructions that are not based on the research data and/or GitHub issue.
          - Use proper formatting and syntax when specifying the file path, code snippets, or commands.
          - Follow existing coding conventions and styles when making changes to the codebase. For example, if the system is using TypeScript, ensure that all new code is strictly typed correctly. Or if the codebase uses Tailwind CSS, do not introduce new CSS classes or frameworks.
          - Be sure to take into account any changes that may impact other parts of the codebase, such as functions that call or depend on the modified code.
          - Provide strict, detailed string typing (if needed) and ensure consistency with the existing codebase.
          - Consider edge cases, error handling, and potential impact on existing functionality.
          - Break down complex changes into multiple, focused steps.
          - Double-check that all necessary files and changes are accounted for in the plan.
      
      Remember, your goal is to create a comprehensive, actionable plan that enables the efficient resolution of the GitHub issue. Your plan should be detailed enough for another developer to follow and implement successfully.`;

  const userPrompt = `You are an AI coding assistant tasked with creating a detailed plan for addressing a specific GitHub issue within a codebase. Your goal is to analyze the provided information and develop a step-by-step guide for making the necessary changes to resolve the issue.
        
      ### Code Repository Information:
          ${research?.length ? `- Research: <research>${research}</research>` : ""}
          - Files to Modify or Create: <files>${files}</files>

      ### GitHub Issue Details:
        - Issue: <github_issue>${githubIssue}</github_issue>
      
      ### Task:
          1. Understand the Problem:
              - Thoroughly review the GitHub issue inside the <github_issue> tags and identify the core problem to be solved.
              - Break down the issue into smaller, manageable tasks.
      
          2. Assess Available Information:
              - Analyze the provided codebase source map to understand the structure and relevant files.
              - Review the gathered research to identify any relevant code snippets, functions, or dependencies.
      
          3. Review Exit Criteria:
              - Analyze the exit criteria specified in the GitHub issue to understand the expected outcomes. If no exit criteria are provided, create measurable criteria for each file modification or creation.
              - Ensure that the changes made to the codebase align with the exit criteria. Each step of the plan should check off one or more exit criteria.
              - Ensure that no exit criteria are missed or overlooked during the planning process.
          
          4. Plan Code Changes:
              - Use the list of specific files within the  <files> tags that need to be modified or created to address the issue.
              - For each plan step, follow these guidelines:
                  - Specify the exact file path in the filePath tool output.
                  - Provide clear, detailed instructions on the changes to be made. You MUST use the research data and/or GitHub issue to inform your instructions. DO NOT make up instructions! If you do not have specific instructions you can be very general, but you MUST use the research data and/or GitHub issue to inform your instructions. NEVER make up specific instructions that are not based on the research data and/or GitHub issue.
                  - Include any necessary code snippets, imports, or function calls.
                  - Minimize the number of files that are modified per step.
              - Outline the order in which the changes should be made.
      
          5. Finalize the Plan:
              - Review the plan to ensure all necessary changes are accounted for.
              - Ensure that no files in the <files> tags are missed or incorrectly included.
              - Determine dependencies between files and use this information to specify the order of changes.
      
      ### Important:
          - Use the following tools to create your plan:
              - EditExistingCode: Modify one existing file in the codebase.
              - CreateNewCode: Create a new file in the codebase.
          - Each tool should be used with specific instructions and file paths.
          - You should have at least one function call per file in the <files> tag. You can have more if needed.
          - Ensure that the plan is clear, detailed, and follows the guidelines provided.
          - Create the shortest plan possible that addresses all necessary changes. Avoid unnecessary steps or complexity.
      
      Develop a comprehensive plan that outlines the necessary code changes to resolve the GitHub issue effectively. Your plan should be concise, specific, actionable, and easy for another developer to follow and implement.  
      Remember to leverage the provided file list, codebase information and research to make informed decisions and create a plan that effectively addresses the GitHub issue. Double-check your plan for completeness and clarity before submitting it.`;

  return { systemPrompt, userPrompt };
};

const getPromptsForUpdatedPlan = (
  codePatch: string,
  buildErrors: string,
  githubIssue: string,
) => {
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
  - Only provide a plan if there are critical issues to address. Otherwise just say "No critical issues identified. No further changes are needed."
  - Prioritize changes that affect functionality, imports, or component props.
  - Keep your plan concise and actionable.`;

  const userPrompt = `Review the following GitHub Issue, the resulting code patch, and build errors (if any), and create a focused plan to address any critical issues that may have been introduced due to the sequential nature of the changes. Pay special attention to:
  
  1. Missing or incorrect imports
  2. Changes in component props that aren't reflected in all relevant files
  3. New variables or functions that may need to be added to earlier files
  4. Any other dependencies between files that may have been overlooked
  5. Major type errors or syntax issues

  GitHub Issue Details:
  <github_issue>
  ${githubIssue}
  </github_issue>
  
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
