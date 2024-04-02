import { executeWithLogRequiringSuccess, ExecAsyncException } from "../utils";

const appName = process.env.GITHUB_APP_NAME ?? "";
const appUsername = process.env.GITHUB_APP_USERNAME ?? "";

export async function addCommitAndPush(
  rootPath: string,
  branchName: string,
  commitMessage: string,
) {
  // Stage all files
  await executeWithLogRequiringSuccess(rootPath, "git add .");

  // Prepare author info
  await executeWithLogRequiringSuccess(
    rootPath,
    `git config --local user.name "${appName}[bot]"`,
  );
  await executeWithLogRequiringSuccess(
    rootPath,
    `git config --local user.email "${appUsername}+${appName}[bot]@users.noreply.github.com"`,
  );

  // Commit files
  try {
    await executeWithLogRequiringSuccess(
      rootPath,
      `git commit -m "${commitMessage.replace(/`/g, "\\`")}"`,
    );
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
  return executeWithLogRequiringSuccess(
    rootPath,
    `git push --set-upstream origin ${branchName}`,
  );
}
