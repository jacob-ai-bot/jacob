import { Octokit } from "@octokit/rest";
import { cloneAndGetSourceMap, getExtractedIssue } from "../api/utils";
import { getIssue } from "../github/issue";
import { db } from "../db/db";
import { TodoStatus } from "../db/enums";

export const createTodos = async (
  repo: string,
  projectId: number,
  accessToken?: string,
  login?: string | undefined,
  max?: number,
) => {
  const [repoOwner, repoName] = repo?.split("/") ?? [];

  if (!repoOwner || !repoName) {
    throw new Error("Invalid repo name");
  }

  if (!accessToken) {
    throw new Error("Access token is required");
  }

  const sourceMap = await cloneAndGetSourceMap(repo, accessToken);
  const octokit = new Octokit({ auth: accessToken });

  const { data: unassignedIssues } = await octokit.issues.listForRepo({
    owner: repoOwner,
    repo: repoName,
    state: "open",
    assignee: "none",
  });

  const { data: myIssues } = await octokit.issues.listForRepo({
    owner: repoOwner,
    repo: repoName,
    state: "open",
    assignee: login ?? "none",
  });

  const issues = [...unassignedIssues, ...myIssues];

  // remove the pull requests
  const issuesWithoutPullRequests = issues.filter(
    ({ pull_request }) => !pull_request,
  );

  const ids = issuesWithoutPullRequests
    .map((issue) => issue.number)
    .filter(Boolean)
    .slice(0, max);

  const issueData = await Promise.all(
    ids.map((issueNumber) =>
      getIssue(
        { name: repoName, owner: { login: repoOwner } },
        accessToken,
        issueNumber,
      ),
    ),
  );

  await Promise.all(
    issueData.map(async ({ data: issue }) => {
      // add the todo to the database
      // Try to find a todo with the same projectId and issueId
      const existingTodo = await db.todos.findByOptional({
        projectId: projectId,
        issueId: issue.number,
      });

      // Only insert the new todo if no such todo exists
      if (!existingTodo) {
        const issueBody = issue.body ? `\n${issue.body}` : "";
        const issueText = `${issue.title}${issueBody}`;

        const extractedIssue = await getExtractedIssue(sourceMap, issueText);

        await db.todos.create({
          projectId: projectId,
          description: `${issue.title}\n\n${issueBody}`,
          name: extractedIssue.commitTitle ?? issue.title ?? "New Todo",
          status: TodoStatus.TODO,
          issueId: issue.number,
          position: issue.number, // set the position to the issue number to sort from oldest to newest
        });
      }
    }),
  );
};
