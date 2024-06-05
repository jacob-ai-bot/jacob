import {
  executeWithLogRequiringSuccess,
  type ExecAsyncException,
  type BaseEventData,
  rethrowErrorWithTokenRedacted,
} from "../utils";

const appName = process.env.GITHUB_APP_NAME ?? "";
const appUsername = process.env.GITHUB_APP_USERNAME ?? "";

export interface AddCommitAndPushParams extends BaseEventData {
  rootPath: string;
  branchName: string;
  commitMessage: string;
  token: string;
}

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

  // Commit files
  try {
    await executeWithLogRequiringSuccess({
      ...baseEventData,
      directory: rootPath,
      command: `git commit -m "${commitMessage.replace(/`/g, "\\`")}"`,
    });
  } catch (error) {
    // Log error and rethrow (so we can get better detail around 'nothing to commit' errors)
    const asyncException = (
      typeof error === "object" ? error : { error }
    ) as Partial<ExecAsyncException>;
    console.error(
      `Commit failed: stderr: ${asyncException.stderr}, stdout: ${asyncException.stdout}`,
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
