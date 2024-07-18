import { cloneAndGetSourceMap, getExtractedIssue } from "../api/utils";
import { getIssue } from "../github/issue";
import { db } from "../db/db";
import { TodoStatus } from "../db/enums";
import { researchIssue } from "~/server/agent/research";
import { cloneRepo } from "../git/clone";

export const createTodo = async (
  repo: string,
  projectId: number,
  issueNumber: number,
  accessToken: string | undefined,
) => {
  const [repoOwner, repoName] = repo?.split("/") ?? [];

  if (!repoOwner || !repoName) {
    throw new Error("Invalid repo name");
  }

  if (!accessToken) {
    throw new Error("Access token is required");
  }

  // Check if a todo for this issue already exists
  const existingTodo = await db.todos.findByOptional({
    projectId: projectId,
    issueId: issueNumber,
  });

  if (existingTodo) {
    console.log(`Todo for issue #${issueNumber} already exists`);
    return;
  }

  // Fetch the specific issue
  const { data: issue } = await getIssue(
    { name: repoName, owner: { login: repoOwner } },
    accessToken,
    issueNumber,
  );

  const issueBody = issue.body ? `\n${issue.body}` : "";
  const issueText = `${issue.title}${issueBody}`;

  let cleanupClone: (() => Promise<void>) | undefined;
  try {
    const { path: rootPath, cleanup } = await cloneRepo({
      repoName: repo,
      token: accessToken,
    });
    cleanupClone = cleanup;

    const sourceMap = await cloneAndGetSourceMap(repo, accessToken);

    const extractedIssue = await getExtractedIssue(sourceMap, issueText);

    const newTodo = await db.todos.create({
      projectId: projectId,
      description: `${issue.title}\n\n${issueBody}`,
      name: extractedIssue.commitTitle ?? issue.title ?? "New Todo",
      status: TodoStatus.TODO,
      issueId: issue.number,
      position: issue.number,
    });
    await researchIssue(
      issueText,
      sourceMap,
      newTodo?.id,
      issueNumber,
      rootPath,
    );

    console.log(`Created new todo for issue #${issue.number}`);
  } catch (error) {
    console.error(
      `Error while creating todo for issue #${issue.number}: ${String(error)}`,
    );
    // Consider more specific error handling here
  } finally {
    if (cleanupClone) {
      await cleanupClone();
    }
  }
};
