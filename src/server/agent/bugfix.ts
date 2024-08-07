import { v4 as uuidv4 } from "uuid";
import { type Issue, type Repository } from "@octokit/webhooks-types";
import { runBuildCheck } from "~/server/build/node/check";

import path from "path";
import { type RepoSettings, type BaseEventData } from "~/server/utils";
import { runNpmInstall } from "~/server/build/node/check";
import {
  sendGptRequest,
  sendGptRequestWithSchema,
} from "~/server/openai/request";
import { z } from "zod";
import { type PullRequest } from "~/server/code/agentFixError";
import { getFiles } from "../utils/files";
import { applyAndEvaluateFix } from "./applyFix";
import { type ErrorInfo, parseBuildErrors } from "./llmParseErrors";

/**
 * This module implements a bug fixing system using a hybrid approach
 * combining Tree of Thought (ToT) and Agent Swarm methodologies. The system is designed to
 * automatically fix build errors in TypeScript projects.
 *
 * Key concepts:
 * 1. Tree of Thought (ToT): This approach allows for exploring multiple solution paths
 *    simultaneously, backtracking when necessary, and pursuing the most promising fixes.
 * 2. Agent Swarm: Multiple "bug agents" work in parallel to address different errors,
 *    allowing for efficient handling of multiple issues.
 * 3. Self-Consistency and Chain of Thought: The system uses advanced prompting techniques
 *    to generate and evaluate potential fixes.
 * 4. Iterative Refinement: If a fix partially resolves issues, the system can recursively
 *    attempt to resolve remaining errors.
 * 5. Context-Aware: The system considers the full project context, including file contents,
 *    project structure, and related research.
 * 6. NPM Integration: Automatic assessment and installation of missing npm packages.
 *
 * The process flow:
 * 1. Parse build errors from the input.
 * 2. Check for and install missing npm packages if necessary.
 * 3. Create bug agents for each group of errors (typically by file).
 * 4. For each agent:
 *    a. Generate potential fixes using AI.
 *    b. Apply fixes and evaluate results.
 *    c. If successful, commit the change.
 *    d. If partially successful, recursively attempt to fix remaining errors.
 * 5. Repeat until all errors are resolved or max depth is reached.
 *
 */

export type BugAgent = {
  id: string;
  errors: ErrorInfo[];
  potentialFixes: string[];
  appliedFix: string | null;
  buildOutput: string | null;
  commitHash: string | null;
  branchName: string;
};

export type ProjectContext = {
  repository: Repository;
  token: string;
  prIssue: Issue | null;
  body: string | null;
  rootPath: string;
  branch: string;
  existingPr: PullRequest;
  repoSettings?: RepoSettings;
  baseEventData: BaseEventData;
  sourceMapOrFileList: string;
  types: string;
  packages: string;
  styles: string;
  images: string;
  research: string;
};

const MAX_FIXES_PER_BUG = 3;

const NpmAssessmentSchema = z.object({
  needsNpmInstall: z.boolean(),
  packagesToInstall: z.array(z.string()),
});

type NpmAssessment = z.infer<typeof NpmAssessmentSchema>;

/**
 * Assesses if any build errors are due to missing npm packages and installs them if necessary.
 * This function uses AI to analyze build errors and determine if package installation is needed,
 * enhancing the system's ability to resolve dependency-related issues automatically.
 *
 * @param buildErrors - The string containing build error messages.
 * @param projectContext - The context of the project, including paths and settings.
 * @returns A boolean indicating whether any packages were installed.
 */
async function assessAndInstallNpmPackages(
  buildErrors: string,
  projectContext: ProjectContext,
): Promise<boolean> {
  const prompt = `
    Analyze the following build errors and determine:
    1. If any part of the error is caused by missing npm package(s).
    2. If so, what package(s) need to be installed.

    Build Errors:
    ${buildErrors}

    Respond with a JSON object in the following format:
    {
      "needsNpmInstall": boolean,
      "packagesToInstall": string[]
    }

    Only include packages that are directly mentioned in the error messages.
  `;

  const assessment = (await sendGptRequestWithSchema(
    prompt,
    "You are an expert in analyzing TypeScript and JavaScript build errors.",
    NpmAssessmentSchema,
    0.2,
    projectContext.baseEventData,
  )) as NpmAssessment;

  if (assessment.needsNpmInstall && assessment.packagesToInstall.length > 0) {
    console.log(
      `Need to install npm package(s): ${assessment.packagesToInstall.join(", ")}`,
    );

    for (const packageName of assessment.packagesToInstall) {
      await runNpmInstall({
        ...projectContext.baseEventData,
        path: projectContext.rootPath,
        packageName: packageName.trim(),
        repoSettings: projectContext.repoSettings,
      });
    }

    return true;
  }

  return false;
}

/**
 * The main entry point for resolving build errors. This function orchestrates the entire
 * bug-fixing process, including npm package assessment, bug agent creation, and error resolution.
 * It implements the core logic of the Tree of Thought approach by managing multiple bug agents
 * and their resolution attempts.
 *
 * @param projectContext - The context of the project, including paths and settings.
 * @returns An array of successful fixes applied to resolve the errors.
 * @throws Error if not all errors could be resolved.
 */

export async function fixBuildErrors(
  projectContext: ProjectContext,
): Promise<string[]> {
  console.log("Starting error resolution");

  const { rootPath, baseEventData, repoSettings } = projectContext;
  const successfulFixes: string[] = [];
  const MAX_ITERATIONS = 1; // TODO: experiment with higher values

  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    console.log(`Starting iteration ${iteration}`);

    // Check for build errors
    let buildErrors: string;
    try {
      await runBuildCheck({
        ...baseEventData,
        path: rootPath,
        afterModifications: true,
        repoSettings,
      });
      console.log("Build successful, no errors to fix");
      return successfulFixes;
    } catch (error) {
      buildErrors = (error as Error).message;
      console.log("Build failed:", buildErrors);
    }

    // Check and install npm packages if needed
    const installedPackages = await assessAndInstallNpmPackages(
      buildErrors,
      projectContext,
    );
    if (installedPackages) {
      successfulFixes.push("Installed required npm package(s)");
      continue; // Move to next iteration to check for any remaining errors
    }

    // Create bug agents and generate fixes
    const agents = await createBugAgents(buildErrors);
    const allErrors = agents.flatMap((agent) => agent.errors);

    for (const agent of agents) {
      const fixes = await generatePotentialFixes(agent, projectContext);

      for (const fix of fixes) {
        const result = await applyAndEvaluateFix(
          agent,
          fix,
          projectContext,
          allErrors,
        );

        if (result.success) {
          successfulFixes.push(fix);
          console.log("Successfully resolved errors:", result.resolvedErrors);
          break; // Move to the next agent after a successful fix
        }
      }
    }

    // Check if all errors are resolved
    try {
      await runBuildCheck({
        ...baseEventData,
        path: rootPath,
        afterModifications: true,
        repoSettings,
      });
      console.log("All errors resolved");
      return successfulFixes;
    } catch (error) {
      console.log("Some errors still remain");
    }
  }

  console.log(
    `Unable to resolve all errors after ${MAX_ITERATIONS} iterations`,
  );
  return successfulFixes;
}

/**
 * Creates BugAgent objects for each group of related errors (typically by file).
 * This function initializes the agent swarm, preparing individual agents to tackle
 * specific errors in parallel.
 *
 * @param buildErrors - The string containing build error messages.
 * @param rootPath - The root path of the project.
 * @returns An array of BugAgent objects, each responsible for a group of related errors.
 */
async function createBugAgents(buildErrors: string): Promise<BugAgent[]> {
  const errors = await parseBuildErrors(buildErrors);
  const groupedErrors = errors.reduce(
    (acc, error) => {
      const key = error.filePath;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key]?.push(error);
      return acc;
    },
    {} as Record<string, ErrorInfo[]>,
  );

  return Object.entries(groupedErrors).map(([filePath, errors]) => ({
    id: uuidv4(),
    errors,
    potentialFixes: [],
    appliedFix: null,
    buildOutput: null,
    commitHash: null,
    branchName: `fix-${path.basename(filePath)}-${uuidv4().slice(0, 8)}`,
  }));
}
/**
 * Generates potential fixes for a given set of errors using AI.
 * This function leverages advanced language models to propose multiple
 * solutions, considering the full context of the errors and the project.
 * The fixes are returned in the LLM Diff Format for easy application.
 *
 * @param agent - The BugAgent object representing the current bug being addressed.
 * @param projectContext - The context of the project, including paths and settings.
 * @returns An array of strings, each representing a potential fix in LLM Diff Format.
 */
export async function generatePotentialFixes(
  agent: BugAgent,
  projectContext: ProjectContext,
): Promise<string[]> {
  console.log("Generating potential fixes for agent: ", agent.id);

  const errorSummary = agent.errors
    .map(
      (e) =>
        `${e.filePath}: ${e.lineNumber} - ${e.errorType}: ${e.errorMessage}`,
    )
    .join("\n");
  console.log("errorSummary: ", errorSummary);

  const filePath = agent.errors[0]?.filePath ?? "";

  const fileContent = getFiles(projectContext.rootPath, [filePath]);
  // We should pass in type information here, and potentially the file list

  const { types, packages, styles, images, research, sourceMapOrFileList } =
    projectContext;

  const userPrompt = `Given the following TypeScript build errors and file content, suggest up to ${MAX_FIXES_PER_BUG} potential fixes:
    Errors:
    ${errorSummary}

    File Content:
    ${fileContent}

    Provide your suggestions as code patches in the LLM Diff Format. Each patch should be wrapped in <code_patch> tags.`;

  const systemPrompt = `You are a senior Technical Fellow at Microsoft, tasked with addressing TypeScript build errors by making precise, minimal changes to the code.

    Here is some information about the code respository to help you resolve the errors:
    - File List: ${sourceMapOrFileList}
    - Types: ${types}
    - Packages: ${packages}
    - Styles: ${styles}
    - Images: ${images}
    - Research: ${research}

    Instructions:
    1. Address all errors mentioned in the error summary.
    2. Provide your solution as a code patch in the specified LLM Diff Format.
    3. Wrap your entire code patch output within <code_patch> tags.
    4. If there are no changes to be made, return <code_patch></code_patch>.
    5. Use your knowledge of the existing code repository to make the most appropriate changes.

    LLM Diff Format Rules:
    - Use file headers: "--- <file path>" and "+++ <file path>"
    - Start each chunk with: "@@ -<original line> +<new line> @@"
    - Prefix removed lines with "-", added lines with "+", and context lines with a space
    - Include at least 5 lines of context before and after changes (or all available if fewer)
    - Use the exact line numbers from the file content provided

    Remember: Only output the code patch within the <code_patch> tags. Any explanations or comments should be outside these tags.`;

  console.log(
    "userPrompt: ",
    `${userPrompt.slice(0, 200)}...${userPrompt.slice(-200)}`,
  );
  console.log(
    "systemPrompt: ",
    `${systemPrompt.slice(0, 200)}...${systemPrompt.slice(-200)}`,
  );
  const response = await sendGptRequest(userPrompt, systemPrompt);
  console.log("response: ", response);

  if (!response) return [];

  const patches = response.match(/<code_patch>[\s\S]*?<\/code_patch>/g) ?? [];
  console.log("patches: ", patches);
  return patches.map((patch) => patch.replace(/<\/?code_patch>/g, "").trim());
}
