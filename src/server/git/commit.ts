import {
  executeWithLogRequiringSuccess,
  type ExecAsyncException,
  type BaseEventData,
  rethrowErrorWithTokenRedacted,
  generateCommitMessage,
} from "../utils";

const appName = process.env.GITHUB_APP_NAME ?? "";
const appUsername = process.env.GITHUB_APP_USERNAME ?? "";

export interface AddCommitAndPushParams extends BaseEventData {
  rootPath: string;
  branchName: string;
  commitMessage: string;
  token: string;
}

function sanitizeCommitMessage(message: string): string {
  // Escape all special characters
  return message.replace(/([`"$\\!'&|;<>])/g, "\\$1");
}

const MAX_DIFF_SIZE = 4000;

export async function addCommitAndPush({
  rootPath,
  branchName,
  commitMessage,
  token,
  ...baseEventData
}: AddCommitAndPushParams) {
  // Stage all files
  await executeWithLogRequiringSuccess({
    ...baseEventData,
    directory: rootPath,
    command: "git add .",
  });

  // Prepare author info
  await executeWithLogRequiringSuccess({
    ...baseEventData,
    directory: rootPath,
    command: `git config --local user.name "${appName}[bot]"`,
  });
  await executeWithLogRequiringSuccess({
    ...baseEventData,
    directory: rootPath,
    command: `git config --local user.email "${appUsername}+${appName}[bot]@users.noreply.github.com"`,
  });

  // Check for changes and commit if necessary
  try {
    const { stdout: statusOutput } = await executeWithLogRequiringSuccess({
      ...baseEventData,
      directory: rootPath,
      command: "git status --porcelain",
    });

    const hasChanges = statusOutput.toString().trim() !== "";

    if (hasChanges) {
      const { stdout: diffOutput } = await executeWithLogRequiringSuccess({
        ...baseEventData,
        directory: rootPath,
        command: "git diff --staged",
      });

      let processedDiffOutput = diffOutput;
      if (diffOutput.length > MAX_DIFF_SIZE) {
        processedDiffOutput =
          diffOutput.slice(0, MAX_DIFF_SIZE) + "\n... (truncated)";
      }

      let generatedMessage = null;
      try {
        generatedMessage = await generateCommitMessage(
          processedDiffOutput,
          commitMessage,
        );
      } catch (error) {
        console.warn("Failed to generate commit message:", error);
        generatedMessage = null;
      }

      const finalMessage = generatedMessage || commitMessage;
      const sanitizedMessage = sanitizeCommitMessage(finalMessage);

      await executeWithLogRequiringSuccess({
        ...baseEventData,
        directory: rootPath,
        command: `git commit -m "${sanitizedMessage}"`,
      });
      console.log("Changes committed successfully");
    } else {
      console.log("No changes to commit");
    }
  } catch (error) {
    // Log error and rethrow
    const asyncException = (
      typeof error === "object" ? error : { error }
    ) as Partial<ExecAsyncException>;
    console.error(
      `Git operation failed: stderr: ${asyncException.stderr}, stdout: ${asyncException.stdout}`,
      error,
    );
    throw error;
  }

  // Push branch to origin
  try {
    return await executeWithLogRequiringSuccess({
      ...baseEventData,
      directory: rootPath,
      command: `git push --set-upstream origin ${branchName}`,
    });
  } catch (error) {
    rethrowErrorWithTokenRedacted(error, token);
  }
}
