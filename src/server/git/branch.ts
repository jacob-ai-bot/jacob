import { executeWithLogRequiringSuccess, type BaseEventData } from "../utils";

export interface SetNewBranchParams extends BaseEventData {
  rootPath: string;
  branchName: string;
}

export async function setNewBranch({
  rootPath,
  branchName,
  ...baseEventData
}: SetNewBranchParams) {
  // first check to see if we're already on that branch. If not, create it.
  const currentBranch = (
    await executeWithLogRequiringSuccess({
      ...baseEventData,
      directory: rootPath,
      command: "git rev-parse --abbrev-ref HEAD",
    })
  ).stdout
    .toString()
    .trim();
  if (currentBranch === branchName) {
    console.log("Already on branch: ", branchName);
    return;
  }

  // now check to see if the branch already exists
  const branches = (
    await executeWithLogRequiringSuccess({
      ...baseEventData,
      directory: rootPath,
      command: "git branch",
    })
  ).stdout
    .toString()
    .trim();
  if (branches.includes(branchName)) {
    console.log("Branch already exists: ", branchName);
    // Checkout the existing branch
    return executeWithLogRequiringSuccess({
      ...baseEventData,
      directory: rootPath,
      command: `git checkout ${branchName}`,
    });
  }

  // Create a new branch
  return executeWithLogRequiringSuccess({
    ...baseEventData,
    directory: rootPath,
    command: `git checkout -b ${branchName}`,
  });
}

export interface CheckoutCommitParams extends BaseEventData {
  rootPath: string;
  commit: string;
}

export function checkoutCommit({
  rootPath,
  commit,
  ...baseEventData
}: CheckoutCommitParams) {
  return executeWithLogRequiringSuccess({
    ...baseEventData,
    directory: rootPath,
    command: `git checkout ${commit}`,
  });
}
