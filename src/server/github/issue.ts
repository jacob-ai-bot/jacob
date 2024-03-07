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
    userAgent: "jacob",
  });

  return octokit.issues.createComment({
    owner: repository.owner.login,
    repo: repository.name,
    issue_number: issueOrPRNumber,
    body,
  });
}

export async function getIssue(
  repository: Repository,
  token: string,
  issue_number: number,
) {
  const octokit = new Octokit({
    auth: token,
    log: console,
    userAgent: "jacob",
  });

  return octokit.issues.get({
    owner: repository.owner.login,
    repo: repository.name,
    issue_number,
  });
}

export async function createRepoInstalledIssue(
  repository: Pick<Repository, "owner" | "name">,
  token: string,
  assignee?: string,
  error?: Error,
) {
  const octokit = new Octokit({
    auth: token,
    log: console,
    userAgent: "jacob",
  });

  const body = error
    ? `JACoB here...\nI can now access this repo, but ran into trouble building.\n\nHere is some additional info on the error(s) I saw:\n\n${
        (error as { message?: string })?.message ?? error.toString()
      }
      
      Please visit the [JACoB documentation](https://docs.jacb.ai) for more information on how to resolve this issue.
      `
    : "JACoB here...\nI can now access this repo and build the project successfully!\n\nPlease visit the [JACoB documentation](https://docs.jacb.ai) for more information on how to get started with JACoB.";

  return octokit.issues.create({
    owner: repository.owner.login,
    repo: repository.name,
    title: "JACoB Installed",
    body,
    assignee,
  });
}
