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
  issueTitle?: string;
  issueBody?: string;
  token: string;
}

export async function addCommitAndPush({
  rootPath,
  branchName,
  issueTitle,
  issueBody,
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
      let commitMessage = "";
      try {
        commitMessage = await generateCommitMessage(issueTitle, issueBody);
      } catch (error) {
        console.error("Error generating commit message:", error);
        commitMessage = "Automatic commit";
      }
      await executeWithLogRequiringSuccess({
        ...baseEventData,
        directory: rootPath,
        command: `git commit -m "${commitMessage}"`,
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
