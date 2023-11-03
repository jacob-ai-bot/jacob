import { Octokit } from "@octokit/rest";
import { Repository } from "@octokit/webhooks-types";

export async function createPR(
  repository: Repository,
  token: string,
  newBranch: string,
  title: string,
  body: string,
  reviewers: string[],
) {
  const octokit = new Octokit({
    auth: token,
    log: console,
    userAgent: "otto",
  });

  const result = await octokit.pulls.create({
    owner: repository.owner.login,
    repo: repository.name,
    title,
    head: newBranch,
    base: repository.default_branch,
    body,
  });

  if (reviewers.length > 0) {
    await octokit.pulls.requestReviewers({
      owner: repository.owner.login,
      repo: repository.name,
      pull_number: result.data.number,
      reviewers,
    });
  }

  return result;
}
