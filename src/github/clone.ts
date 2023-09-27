import { dir, DirectoryResult } from "tmp-promise";
import { execAsyncWithLog } from "../../utils";

// const SSH_PREFIX = "git@github.com:";
const HTTPS_PREFIX = "https://github.com/";
const GIT_REPO_SUFFIX = ".git";

export async function cloneRepo(
  repoName: string,
  branch?: string,
): Promise<DirectoryResult> {
  const result = await dir({ unsafeCleanup: true });
  const { path } = result;

  const args = branch ? `-b ${branch}` : "";
  const cloneCommand = `git clone ${args} ${HTTPS_PREFIX}${repoName}${GIT_REPO_SUFFIX} .`;
  console.log(`Exec: ${cloneCommand} cwd: ${path}`);
  await execAsyncWithLog(cloneCommand, { cwd: path });

  return result;
}
