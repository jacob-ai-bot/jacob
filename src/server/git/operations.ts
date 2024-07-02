// /git/operations.ts

import {
  type BaseEventData,
  executeWithLogRequiringSuccess,
  rethrowErrorWithTokenRedacted,
  executeWithLogRequiringSuccessWithoutEvent,
} from "../utils";

interface GitOperationParams {
  directory: string;
  token?: string;
  baseEventData?: BaseEventData;
}

async function executeGitCommand(
  command: string,
  { directory, token, baseEventData }: GitOperationParams,
): Promise<void> {
  try {
    if (baseEventData) {
      await executeWithLogRequiringSuccess({
        ...baseEventData,
        directory,
        command,
      });
    } else {
      await executeWithLogRequiringSuccessWithoutEvent({
        directory,
        command,
      });
    }
  } catch (error) {
    if (token) {
      rethrowErrorWithTokenRedacted(error, token);
    } else {
      throw error;
    }
  }
}

export async function gitCommit(
  message: string,
  params: GitOperationParams,
): Promise<string | null> {
  const command = `git commit -m "${message.replace(/"/g, '\\"')}"`;
  await executeGitCommand(command, params);

  // Get the commit hash
  try {
    const { stdout } = await executeWithLogRequiringSuccessWithoutEvent({
      directory: params.directory,
      command: "git rev-parse HEAD",
    });
    if (typeof stdout !== "string") {
      return null;
    }
    return stdout?.trim() ?? "";
  } catch (error) {
    console.error("Failed to get commit hash:", error);
    return null;
  }
}

export async function gitStash(params: GitOperationParams): Promise<void> {
  const command = "git stash";
  await executeGitCommand(command, params);
}

export async function gitStashPop(params: GitOperationParams): Promise<void> {
  const command = "git stash pop";
  await executeGitCommand(command, params);
}

export async function gitCheckout(
  branchOrCommit: string,
  params: GitOperationParams,
): Promise<void> {
  let command = `git checkout ${branchOrCommit}`;
  try {
    await executeGitCommand(command, params);
  } catch (error) {
    // If the branch does not exist, create it and check it out
    console.error(
      `Error checking out ${branchOrCommit}: Trying to create a new branch.`,
    );
    command = `git checkout -b ${branchOrCommit}`;
    await executeGitCommand(command, params);
  }
}
export async function gitBranch(
  branchName: string,
  params: GitOperationParams,
): Promise<void> {
  const command = `git branch ${branchName}`;
  await executeGitCommand(command, params);
}

export async function gitPush(
  branchName: string,
  params: GitOperationParams,
): Promise<void> {
  const command = `git push origin ${branchName}`;
  await executeGitCommand(command, params);
}

export async function gitPull(params: GitOperationParams): Promise<void> {
  const command = "git pull";
  await executeGitCommand(command, params);
}

export async function gitReset(
  mode: "soft" | "mixed" | "hard",
  commit = "HEAD",
  params: GitOperationParams,
): Promise<void> {
  const command = `git reset --${mode} ${commit}`;
  await executeGitCommand(command, params);
}
