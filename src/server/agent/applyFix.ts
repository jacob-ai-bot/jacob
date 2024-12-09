import {
  runBuildCheck,
  type RunBuildCheckParams,
} from "~/server/build/node/check";
import { applyCodePatchViaLLM } from "./patch";
import { type ErrorInfo, parseBuildErrors } from "./llmParseErrors";
import { addCommitAndPush } from "~/server/git/commit";
import { type BugAgent, type ProjectContext } from "./bugfix";

/**
 * Applies a potential fix to the codebase and evaluates its effectiveness.
 * This function is a core part of the bug-fixing process, handling the actual
 * code modification, build testing, and result evaluation.
 *
 * @param agent - The BugAgent object representing the current bug being addressed.
 * @param fix - The potential fix to be applied.
 * @param projectContext - The context of the project, including paths and settings.
 * @returns An object containing the success status, build output, and resolved errors.
 */
export async function applyAndEvaluateFix(
  agent: BugAgent,
  fix: string,
  projectContext: ProjectContext,
  allErrors: ErrorInfo[],
): Promise<{
  success: boolean;
  buildOutput: string;
  resolvedErrors: ErrorInfo[];
}> {
  console.log("Applying and evaluating fix");
  const { token, repoSettings, baseEventData, rootPath, branch } =
    projectContext;
  const { errors } = agent;
  const filePath = errors[0]?.filePath ?? "";

  try {
    // Apply the fix
    await applyCodePatchViaLLM(rootPath, filePath, fix);

    // Commit and push changes
    const message = `Apply fix for ${filePath}`;
    await addCommitAndPush({
      rootPath,
      branchName: branch,
      issueTitle: message,
      token,
      ...baseEventData,
    });

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
    } catch (error) {
      buildOutput = (error as Error).message;
    }
    console.log("Build output:", buildOutput);

    // Analyze remaining errors
    const remainingErrors = await parseBuildErrors(buildOutput);
    const resolvedErrors = allErrors.filter(
      (error) =>
        !remainingErrors.some(
          (remaining) =>
            remaining.filePath === error.filePath &&
            remaining.lineNumber === error.lineNumber &&
            remaining.errorType === error.errorType,
        ),
    );
    console.log("Resolved errors:", resolvedErrors);
    console.log("Remaining errors:", remainingErrors);

    return {
      success: buildSuccess,
      buildOutput,
      resolvedErrors,
    };
  } catch (error) {
    console.error("Error applying and evaluating fix:", error);
    return {
      success: false,
      buildOutput: (error as Error).message,
      resolvedErrors: [],
    };
  }
}
