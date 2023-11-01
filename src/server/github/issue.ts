import { Octokit } from "@octokit/rest";
import { Repository } from "@octokit/webhooks-types";

export function addCommentToIssue(
  repository: Repository,
  issueOrPRNumber: number,
  token: string,
  body: string,
) {
  const octokit = new Octokit({
    auth: token,
    log: console,
    userAgent: "otto",
  });

  return octokit.issues.createComment({
    owner: repository.owner.login,
    repo: repository.name,
    issue_number: issueOrPRNumber,
    body,
  });
}
