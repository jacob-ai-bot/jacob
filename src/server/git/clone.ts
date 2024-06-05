import { dir, type DirectoryResult } from "tmp-promise";
import {
  type BaseEventData,
  executeWithLogRequiringSuccess,
  rethrowErrorWithTokenRedacted,
  executeWithLogRequiringSuccessWithoutEvent,
} from "../utils";

const HTTPS_PREFIX = "https://";
const HTTPS_SUFFIX = "github.com/";
const GIT_REPO_SUFFIX = ".git";

export interface CloneRepoParams {
  repoName: string;
  branch?: string;
  token?: string;
  baseEventData?: BaseEventData;
}

export async function cloneRepo({
  repoName,
  branch,
  token,
  baseEventData,
}: CloneRepoParams): Promise<DirectoryResult> {
  const tmpdir = process.env.TMP_DIR;
  const options = tmpdir
    ? { unsafeCleanup: true, tmpdir }
    : { unsafeCleanup: true };
  const result = await dir(options);
  const { path } = result;

  const args = branch ? `-b ${branch}` : "";
  const tokenArg = token ? `x-access-token:${token}@` : "";
  const cloneCommand = `git clone ${args} ${HTTPS_PREFIX}${tokenArg}${HTTPS_SUFFIX}${repoName}${GIT_REPO_SUFFIX} .`;
  try {
    if (baseEventData) {
      await executeWithLogRequiringSuccess({
        ...baseEventData,
        directory: path,
        command: cloneCommand,
      });
    } else {
      await executeWithLogRequiringSuccessWithoutEvent({
        directory: path,
        command: cloneCommand,
      });
    }
  } catch (error) {
    if (token) {
      rethrowErrorWithTokenRedacted(error, token);
    } else {
      throw error;
    }
  }
  return result;
}
