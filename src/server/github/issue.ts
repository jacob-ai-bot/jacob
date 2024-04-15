import dedent from "ts-dedent";
import { Octokit } from "@octokit/rest";
import { Repository } from "@octokit/webhooks-types";

export const codeReviewCommandSuggestion =
  "Please note: I am available to do code reviews in this repo if you add the comment `@jacob-ai-bot code review` to a pull request.";

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

type SimpleOwner = Pick<Repository["owner"], "login">;
interface SimpleRepository {
  owner: SimpleOwner;
  name: string;
}

export async function getIssue(
  repository: SimpleRepository,
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
  isNodeRepo?: boolean,
  error?: Error,
) {
  const octokit = new Octokit({
    auth: token,
    log: console,
    userAgent: "jacob",
  });

  let body: string;
  if (error) {
    const errorString =
      (error as { message?: string })?.message ?? error.toString();
    body = dedent`
      JACoB here...
      I can now access this repo, but ran into trouble during my installation checks.
      ${
        isNodeRepo
          ? "I tried to verify that I could build this repo in preparation for writing code."
          : ""
      }
      
      Here is some additional info on the error(s) I saw:
      
      ${errorString}

      You may need to add or edit a \`jacob.json\` file in the root of your repository to help me better understand how to build your project.
    
      Please visit the [JACoB documentation](https://docs.jacb.ai) for more information on how to resolve this issue.
    `;
  } else {
    const limitations = isNodeRepo
      ? ""
      : dedent`
      ${codeReviewCommandSuggestion}
      At the moment, I can only write code for JavaScript and TypeScript projects.
      Check back soon for updates on additional language support.
      
    `;
    body = dedent`
      JACoB here...
      I can now access this repo${
        isNodeRepo ? " and build the project successfully" : ""
      }!

      ${limitations}
      
      Please visit the [JACoB documentation](https://docs.jacb.ai) for more information on how to get started with JACoB.
    `;
  }

  return octokit.issues.create({
    owner: repository.owner.login,
    repo: repository.name,
    title: "JACoB Installed",
    body,
    assignee,
  });
}
