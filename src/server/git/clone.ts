import { dir, DirectoryResult } from "tmp-promise";
import { executeWithLogRequiringSuccess } from "../utils";

const HTTPS_PREFIX = "https://";
const HTTPS_SUFFIX = "github.com/";
const GIT_REPO_SUFFIX = ".git";

export async function cloneRepo(
  repoName: string,
  branch?: string,
  token?: string,
): Promise<DirectoryResult> {
  const result = await dir({ unsafeCleanup: true });
  const { path } = result;

  const args = branch ? `-b ${branch}` : "";
  const tokenArg = token ? `x-access-token:${token}@` : "";
  const cloneCommand = `git clone ${args} ${HTTPS_PREFIX}${tokenArg}${HTTPS_SUFFIX}${repoName}${GIT_REPO_SUFFIX} .`;
  await executeWithLogRequiringSuccess(path, cloneCommand);

  return result;
}
