import { v4 as uuidv4 } from "uuid";
import { type Issue, type Repository } from "@octokit/webhooks-types";
import {
  runBuildCheck,
  type RunBuildCheckParams,
} from "~/server/build/node/check";
import { applyCodePatch } from "~/server/code/agentEditFiles";
import {
  sendSelfConsistencyChainOfThoughtGptRequest,
  evaluate,
  type EvaluationInfo,
} from "~/server/openai/utils";
import { gitCommit, gitCheckout, gitReset } from "~/server/git/operations";
import path from "path";
import { type RepoSettings, type BaseEventData } from "~/server/utils";
import { runNpmInstall } from "~/server/build/node/check";
import { sendGptRequestWithSchema } from "~/server/openai/request";
import { z } from "zod";
import { type PullRequest } from "~/server/code/agentFixError";
import { getFiles } from "../files";

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

type ErrorInfo = {
  filePath: string;
  lineNumber: number;
  errorType: string;
  errorMessage: string;
};

type BugAgent = {
  id: string;
  errors: ErrorInfo[];
  potentialFixes: string[];
  appliedFix: string | null;
  buildOutput: string | null;
  commitHash: string | null;
  branchName: string;
};

type ProjectContext = {
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
  research: string;
};

const MAX_DEPTH = 3;
const MAX_FIXES_PER_BUG = 3;
const EVALUATION_CACHE = new Map<string, EvaluationInfo>();

/**
 * Applies a potential fix to the codebase and evaluates its effectiveness.
 * This function is a core part of the bug-fixing process, handling the actual
 * code modification, build testing, and result evaluation.
 *
 * @param agent - The BugAgent object representing the current bug being addressed.
 * @param fix - The potential fix to be applied.
 * @param projectContext - The context of the project, including paths and settings.
 * @returns An object containing the success status, build output, evaluation, and commit hash.
 */
async function applyAndEvaluateFix(
  agent: BugAgent,
  fix: string,
  projectContext: ProjectContext,
): Promise<{
  success: boolean;
  buildOutput: string;
  evaluation: EvaluationInfo | null;
  commitHash: string | null;
}> {
  const { token, repoSettings, baseEventData, rootPath } = projectContext;
  const { branchName, errors } = agent;
  const gitParams = {
    directory: rootPath,
    token,
    baseEventData,
  };
  const filePath = errors[0]?.filePath ?? "";

  try {
    // Ensure we're on the correct branch
    await gitCheckout(branchName, gitParams);
    console.log("Checked out branch:", branchName);

    // Create a temporary commit to store the current state
    await gitCommit("Temporary commit before fix attempt", gitParams);
    const tempCommitHash = await gitCommit("Temporary state", gitParams);

    console.log("Applying fix:", fix);
    console.log("filePath:", filePath);
    // Apply the fix
    await applyCodePatch(rootPath, filePath, fix);

    console.log("Running build check after fix...");
    // Run build check
    const buildCheckParams: RunBuildCheckParams = {
      ...baseEventData,
      path: rootPath,
      afterModifications: true,
      repoSettings,
    };

    let buildOutput = "";
    let buildSuccess = false;
    try {
      await runBuildCheck(buildCheckParams);
      buildOutput = "Build successful";
      buildSuccess = true;
      console.log("Build successful after fix");
    } catch (error) {
      buildOutput = (error as Error).message;
      console.log("Build failed after fix:", buildOutput);
    }

    // Evaluate the fix
    const cacheKey = `${filePath}:${fix}`;
    let evaluation: EvaluationInfo | null | undefined =
      EVALUATION_CACHE.get(cacheKey);

    if (!evaluation) {
      const evaluationPrompt = `
        Original errors: ${JSON.stringify(errors)}
        Applied fix: ${fix}
        Build output: ${buildOutput}
        
        Evaluate the effectiveness of this fix. Consider:
        1. Does it resolve the original errors?
        2. Does it introduce any new issues?
        3. Is the fix appropriate and maintainable?
        4. Does it adhere to ${repoSettings?.language} best practices?
      `;

      console.log("Evaluating fix...");
      const evaluationResult = await evaluate(
        buildOutput,
        evaluationPrompt,
        `You are an expert ${repoSettings?.language} code reviewer.`,
        baseEventData,
        ["claude-3-5-sonnet-20240620"], // Just do one evaluation for now
      );
      evaluation = evaluationResult[0] ?? null;
      console.log("Evaluation result:", evaluation);
      if (evaluation) {
        EVALUATION_CACHE.set(cacheKey, evaluation);
      }
    }

    let commitHash: string | null = null;
    if (buildSuccess) {
      console.log("Build was successful! Committing fix...");
      commitHash = await gitCommit(`Apply fix for ${filePath}`, gitParams);
    } else {
      // Revert to the state before the fix attempt
      console.log("Build was unsuccessful, reverting changes...");
      await gitReset("hard", tempCommitHash ?? undefined, gitParams);
    }

    return {
      success: buildSuccess,
      buildOutput,
      evaluation,
      commitHash,
    };
  } catch (error) {
    console.error("Error applying and evaluating fix:", error);
    // Ensure we revert any changes on error
    await gitReset("hard", "HEAD", gitParams);
    return {
      success: false,
      buildOutput: (error as Error).message,
      evaluation: null,
      commitHash: null,
    };
  }
}

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
 * @param buildErrors - The string containing build error messages.
 * @param projectContext - The context of the project, including paths and settings.
 * @returns An array of successful fixes applied to resolve the errors.
 * @throws Error if not all errors could be resolved.
 */
export async function fixError(
  buildErrors: string,
  projectContext: ProjectContext,
): Promise<string[]> {
  console.log("Starting error resolution with Enhanced Bug Agents approach");

  // First check to see if any of the errors are caused by missing npm packages
  const installedPackages = await assessAndInstallNpmPackages(
    buildErrors,
    projectContext,
  );

  if (installedPackages) {
    // Re-run build check after npm install
    const buildCheckParams: RunBuildCheckParams = {
      ...projectContext.baseEventData,
      path: projectContext.rootPath,
      afterModifications: true,
      repoSettings: projectContext.repoSettings,
    };

    try {
      await runBuildCheck(buildCheckParams);
      console.log("Build successful after npm install");
      return ["Installed required npm package(s)"];
    } catch (error) {
      console.log(
        "Build still failing after npm install. Proceeding with bug fixing.",
      );
      buildErrors = (error as Error).message;
    }
  }

  console.log("creating bug agents...");
  const agents = await createBugAgents(buildErrors);
  const successfulFixes: string[] = [];

  for (const agent of agents) {
    console.log("\n\n\n*******************************");
    console.log("starting agent: ", agent.id);
    console.log("errors: ", agent.errors);
    console.log("potential fixes: ", agent.potentialFixes);
    console.log("applied fix: ", agent.appliedFix);
    console.log("build output: ", agent.buildOutput);
    console.log("commit hash: ", agent.commitHash);
    console.log("branch name: ", agent.branchName);
    console.log("*******************************\n\n\n");
    const result = await resolveBug(agent, projectContext);
    console.log("result: ", result);
    if (result) {
      console.log("Successfully resolved bug group");
      successfulFixes.push(result.appliedFix ?? "");
    }
  }

  if (successfulFixes.length === agents.length) {
    console.log(`Successfully resolved all ${agents.length} bug groups`);
    return successfulFixes;
  } else {
    console.log(
      `Resolved ${successfulFixes.length} out of ${agents.length} bug groups`,
    );
    throw new Error(
      `Unable to resolve all errors: ${agents.length - successfulFixes.length} remaining`,
    );
  }
}
/**
 * Parses the build output to extract structured error information.
 * This function is crucial for understanding the nature and location of each error,
 * allowing the system to target fixes more accurately.
 *
 * @param buildOutput - The raw build output containing error messages.
 * @returns An array of ErrorInfo objects, each representing a parsed error.
 */
function parseBuildErrors(buildOutput: string): ErrorInfo[] {
  const errors: ErrorInfo[] = [];
  const lines = buildOutput.split("\n");
  let currentFile = "";
  console.log("parsing build errors for buildOutput: ", buildOutput);
  console.log("\n\n\n\n");
  for (const line of lines) {
    const fileMatch = line.match(/\.\/(.+\.tsx?)/);
    if (fileMatch) {
      currentFile = fileMatch[1] ?? "";
      continue;
    }

    const errorMatch = line.match(/(\d+):(\d+)\s+Error:\s+(.+)\s+(@.+)/);
    if (errorMatch && currentFile) {
      errors.push({
        filePath: currentFile,
        lineNumber: parseInt(errorMatch[1] ?? "0", 10),
        errorType: errorMatch[4] ?? "",
        errorMessage: errorMatch[3] ?? "",
      });
    }
  }
  console.log("errors: ", errors);

  return errors;
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
  const errors = parseBuildErrors(buildErrors);
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
async function generatePotentialFixes(
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

  /*
      Source Map or File List:
    ${projectContext.sourceMapOrFileList}
    */
  const fileContent = getFiles(projectContext.rootPath, [filePath]);
  // We should pass in type information here, and potentially the file list
  const userPrompt = `Given the following TypeScript build errors and file content, suggest up to ${MAX_FIXES_PER_BUG} potential fixes:
    Errors:
    ${errorSummary}

    File Content:
    ${fileContent}

    Research:
    ${projectContext.research}

    Provide your suggestions as code patches in the LLM Diff Format. Each patch should be wrapped in <code_patch> tags.`;

  const systemPrompt = `You are a senior Technical Fellow at Microsoft, tasked with addressing TypeScript build errors by making precise, minimal changes to the code.

    Instructions:
    1. Address all errors mentioned in the error summary.
    2. Provide your solution as a code patch in the specified LLM Diff Format.
    3. Wrap your entire code patch output within <code_patch> tags.
    4. If there are no changes to be made, return <code_patch></code_patch>.

    LLM Diff Format Rules:
    - Use file headers: "--- <file path>" and "+++ <file path>"
    - Start each chunk with: "@@ -<original line> +<new line> @@"
    - Prefix removed lines with "-", added lines with "+", and context lines with a space
    - Include at least 5 lines of context before and after changes (or all available if fewer)
    - Use the exact line numbers from the file content provided

    Remember: Only output the code patch within the <code_patch> tags. Any explanations or comments should be outside these tags.`;

  console.log("userPrompt: ", userPrompt);
  console.log("systemPrompt: ", systemPrompt);
  const response = await sendSelfConsistencyChainOfThoughtGptRequest(
    userPrompt,
    systemPrompt,
  );
  console.log("response: ", response);

  if (!response) return [];

  const patches = response.match(/<code_patch>[\s\S]*?<\/code_patch>/g) ?? [];
  console.log("patches: ", patches);
  return patches.map((patch) => patch.replace(/<\/?code_patch>/g, "").trim());
}

/**
 * Attempts to resolve a bug by applying and evaluating potential fixes.
 * This recursive function is the core of the Tree of Thought approach,
 * exploring multiple solution paths and backtracking when necessary.
 *
 * @param agent - The BugAgent object representing the current bug being addressed.
 * @param projectContext - The context of the project, including paths and settings.
 * @param depth - The current depth of the resolution attempt (for limiting recursion).
 * @returns The updated BugAgent if successful, or null if unable to resolve.
 */
async function resolveBug(
  agent: BugAgent,
  projectContext: ProjectContext,
  depth = 0,
): Promise<BugAgent | null> {
  if (depth >= MAX_DEPTH) {
    console.log(
      `Max depth reached for bug in file: ${agent.errors[0]?.filePath ?? "unknown"}`,
    );
    return null;
  }

  console.log(
    `Attempting to resolve bug in file: ${agent.errors[0]?.filePath ?? "unknown"}`,
  );

  if (agent.potentialFixes.length === 0) {
    agent.potentialFixes = await generatePotentialFixes(agent, projectContext);
  }

  const originalErrorCount = agent.errors.length;

  for (const fix of agent.potentialFixes) {
    const { success, buildOutput, evaluation, commitHash } =
      await applyAndEvaluateFix(agent, fix, projectContext);

    if (success) {
      agent.appliedFix = fix;
      agent.buildOutput = buildOutput;
      agent.commitHash = commitHash;
      console.log(
        `Successfully fixed bug in file: ${agent.errors[0]?.filePath ?? "unknown"}`,
      );
      return agent;
    }

    if (evaluation?.rating && evaluation.rating > 3) {
      const remainingErrors = parseBuildErrors(buildOutput);
      if (remainingErrors.length < originalErrorCount) {
        const subAgent: BugAgent = {
          ...agent,
          errors: remainingErrors,
          potentialFixes: [],
        };
        const result = await resolveBug(subAgent, projectContext, depth + 1);
        if (result) {
          return result;
        }
      }
    }

    // Reset the branch to its original state after each unsuccessful fix attempt
    await gitReset("hard", "HEAD", {
      directory: projectContext.rootPath,
      token: projectContext.token,
      baseEventData: projectContext.baseEventData,
    });
  }

  console.log(
    `Failed to resolve bug in file: ${agent.errors[0]?.filePath ?? "unknown"}`,
  );
  return null;
}

export { type ProjectContext, parseBuildErrors };
