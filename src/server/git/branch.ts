import { executeWithLogRequiringSuccess } from "../utils";

export async function setNewBranch(rootPath: string, branchName: string) {
  // first check to see if we're already on that branch. If not, create it.
  const currentBranch = (
    await executeWithLogRequiringSuccess(
      rootPath,
      "git rev-parse --abbrev-ref HEAD",
    )
  )
    .stdout
    .toString()
    .trim();
  if (currentBranch === branchName) {
    console.log("Already on branch: ", branchName);
    return;
  }

  // now check to see if the branch already exists
  const branches = (
    await executeWithLogRequiringSuccess(rootPath, "git branch")
  )
    .stdout
    .toString()
    .trim();
  if (branches.includes(branchName)) {
    console.log("Branch already exists: ", branchName);
    // Checkout the existing branch
    return executeWithLogRequiringSuccess(
      rootPath,
      `git checkout ${branchName}`,
    );
  }

  // Create a new branch
  return executeWithLogRequiringSuccess(
    rootPath,
    `git checkout -b ${branchName}`,
  );
}
