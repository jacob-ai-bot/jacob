// /git/operations.ts

import {
  type BaseEventData,
  executeWithLogRequiringSuccess,
  rethrowErrorWithTokenRedacted,
  executeWithLogRequiringSuccessWithoutEvent,
} from "../utils";
import { type ProjectContext } from "../utils/agent/bugfix";

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
export async function gitStageChanges(
  params: GitOperationParams,
): Promise<void> {
  await executeWithLogRequiringSuccessWithoutEvent({
    directory: params.directory,
    command: "git add -A",
  });
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

export async function gitDeleteBranch(
  branchName: string,
  gitParams: GitOperationParams,
): Promise<void> {
  await executeWithLogRequiringSuccessWithoutEvent({
    ...gitParams,
    command: `git branch -D ${branchName}`,
  });
}

export async function mergeFixToBranch(
  fixBranch: string,
  targetBranch: string,
  gitParams: GitOperationParams,
): Promise<void> {
  try {
    console.log(`Merging ${fixBranch} into ${targetBranch}`);
    await gitCheckout(targetBranch, gitParams);
    await executeWithLogRequiringSuccessWithoutEvent({
      ...gitParams,
      command: `git merge --no-ff ${fixBranch} -m "Merge fix from ${fixBranch}"`,
    });
    console.log(`Successfully merged ${fixBranch} into ${targetBranch}`);
    await gitDeleteBranch(fixBranch, gitParams);
  } catch (error) {
    console.error(`Error merging ${fixBranch} into ${targetBranch}:`, error);
    throw error;
  }
}

export async function gitCheckout(
  branchName: string,
  params: GitOperationParams & { newBranch?: boolean },
): Promise<void> {
  console.log("calling gitCheckout with branchName", branchName);
  console.log("calling gitCheckout with params", params);
  let command = params.newBranch
    ? `git checkout -b ${branchName}`
    : `git checkout ${branchName}`;

  try {
    await executeGitCommand(command, params);
  } catch (error) {
    // If the branch does not exist, create it and check it out
    console.error(
      `Error checking out ${branchName}: Trying to create a new branch.`,
    );
    command = `git checkout -b ${branchName}`;
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

export async function getCurrentCommitHash(
  params: GitOperationParams,
): Promise<string> {
  const { stdout } = await executeWithLogRequiringSuccessWithoutEvent({
    directory: params.directory,
    command: "git rev-parse HEAD",
  });
  if (typeof stdout !== "string") {
    return "";
  }
  return stdout?.trim() ?? "";
}

export async function checkForChanges(
  params: GitOperationParams,
): Promise<boolean> {
  try {
    const { stdout } = await executeWithLogRequiringSuccessWithoutEvent({
      directory: params.directory,
      command: "git status --porcelain",
    });
    if (typeof stdout !== "string") {
      return false;
    }
    return stdout.trim().length > 0;
  } catch (error) {
    console.error("Failed to check for changes:", error);
    return false;
  }
}

export async function commitChangesToBaseBranch(
  projectContext: ProjectContext,
): Promise<void> {
  const { rootPath, token, baseEventData, branch } = projectContext;
  const gitParams = {
    directory: rootPath,
    token,
    baseEventData,
  };

  try {
    await gitCheckout(branch, gitParams);
    const hasChanges = await checkForChanges(gitParams);
    if (hasChanges) {
      await gitStageChanges(gitParams);
      await gitCommit("Apply fixes from bug resolution", gitParams);
      console.log(`Successfully committed changes to ${branch} branch`);
    } else {
      console.log(`No changes to commit on ${branch} branch`);
    }
  } catch (error) {
    console.error(`Error committing changes to ${branch} branch:`, error);
    throw error;
  }
}

export async function gitStash(gitParams: GitOperationParams): Promise<void> {
  try {
    await executeWithLogRequiringSuccessWithoutEvent({
      ...gitParams,
      command: "git stash",
    });
  } catch (error) {
    console.error("Error stashing changes:", error);
    // If there's nothing to stash, it's not a critical error, so we can continue
  }
}

export async function gitStashPop(
  gitParams: GitOperationParams,
): Promise<void> {
  try {
    await executeWithLogRequiringSuccessWithoutEvent({
      ...gitParams,
      command: "git stash pop",
    });
  } catch (error) {
    console.error("Error popping stashed changes:", error);
    // If there's nothing to pop, it's not a critical error, so we can continue
  }
}
