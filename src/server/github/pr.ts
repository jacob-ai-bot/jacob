import { Octokit } from "@octokit/rest";
import { Repository } from "@octokit/webhooks-types";

export function createPR(
  repository: Repository,
  token: string,
  newBranch: string,
  title: string,
  body: string,
) {
  const octokit = new Octokit({
    auth: token,
    log: console,
    userAgent: "otto",
  });

  return octokit.pulls.create({
    owner: repository.owner.login,
    repo: repository.name,
    title,
    head: newBranch,
    base: repository.default_branch,
    body,
  });
}
