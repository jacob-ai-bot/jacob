import { getExtractedIssue } from "~/server/api/utils";
import { getIssue } from "~/server/github/issue";
import { db } from "~/server/db/db";
import { TodoStatus } from "~/server/db/enums";
import {
  getOrCreateResearchForProject,
  researchIssue,
} from "~/server/agent/research";
import { cloneRepo } from "~/server/git/clone";
import { getSourceMap } from "~/server/analyze/sourceMap";
import { getOrGeneratePlan } from "./plan";
import { getRepoSettings, type RepoSettings } from "./settings";
import { getOrCreateCodebaseContext } from "./codebaseContext";
import { traverseCodebase } from "../analyze/traverse";
import { updateJiraTicketWithTodoLink } from "./jira";

interface GetOrCreateTodoParams {
  repo: string;
  projectId: number;
  issueNumber: number;
  accessToken?: string;
  rootDir?: string;
  sourceMap?: string;
  agentEnabled?: boolean;
  repoSettings?: RepoSettings;
  jiraIssueId?: string;
}

export const getOrCreateTodo = async ({
  repo,
  projectId,
  issueNumber,
  accessToken,
  rootDir,
  sourceMap,
  agentEnabled,
  repoSettings,
  jiraIssueId,
}: GetOrCreateTodoParams) => {
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
    return existingTodo;
  }

  // Fetch the specific issue from GitHub
  const { data: issue } = await getIssue(
    { name: repoName, owner: { login: repoOwner } },
    accessToken,
    issueNumber,
  );
  const issueBody = issue.body ? `\n${issue.body}` : "";
  const issueText = `${issue.title}${issueBody}`;

  let cleanupClone: (() => Promise<void>) | undefined;
  try {
    let rootPath = rootDir;
    if (!rootPath) {
      const { path, cleanup } = await cloneRepo({
        repoName: repo,
        token: accessToken,
      });
      rootPath = path;
      cleanupClone = cleanup;
    }

    const sourceMapToUse =
      sourceMap ??
      getSourceMap(
        rootPath,
        repoSettings ?? (await getRepoSettings(rootPath, repo)),
      );
    const extractedIssue = await getExtractedIssue(sourceMapToUse, issueText);

    const newTodo = await db.todos.create({
      projectId: projectId,
      description: issueText,
      name: extractedIssue.commitTitle ?? issue.title ?? "New Todo",
      status: TodoStatus.TODO,
      issueId: issue.number,
      position: issue.number,
      jiraIssueId: jiraIssueId,
    });

    if (jiraIssueId) {
      try {
        const project = await db.projects.findBy({ id: projectId });
        if (!project) {
          throw new Error("Project not found");
        }
        const account = await db.accounts.findBy({ userId: project.ownerId });
        if (!account?.jiraAccessToken || !project.jiraCloudId) {
          throw new Error("Jira credentials not found");
        }
        const todoLink = `https://app.jacb.ai/dashboard/${repoOwner}/${repoName}/todos/${newTodo.id}`;
        await updateJiraTicketWithTodoLink(
          jiraIssueId,
          project.jiraCloudId,
          account.jiraAccessToken,
          todoLink,
        );
      } catch (error) {
        console.error(
          `Error updating Jira ticket ${jiraIssueId}: ${String(error)}`,
        );
      }
    }

    // Only research issues and create plans for agent repos for now
    // TODO: only research issues for premium accounts
    if (agentEnabled) {
      const allFiles = traverseCodebase(rootPath);
      const codebaseContext = await getOrCreateCodebaseContext(
        projectId,
        rootPath,
        allFiles,
      );
      await researchIssue({
        githubIssue: issueText,
        todoId: newTodo.id,
        issueId: issue.number,
        rootDir: rootPath,
        projectId,
      });
      await getOrGeneratePlan({
        projectId,
        issueId: issue.number,
        githubIssue: issueText,
        rootPath,
      });
      await getOrCreateResearchForProject(projectId, codebaseContext);
    } else {
      console.log(`Skipping research for repo ${repo} issue #${issue.number}.`);
    }

    console.log(`Created new todo for issue #${issue.number}`);
    return newTodo;
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

export const archiveTodosByIssueId = async (
  issueId: number,
  projectId: number,
): Promise<void> => {
  try {
    const updatedCount = await db.todos
      .where({ issueId, projectId })
      .update({ isArchived: true });

    console.log(`Archived ${updatedCount} todos for issue #${issueId}`);
  } catch (error) {
    console.error(
      `Error while archiving todos for issue #${issueId}: ${String(error)}`,
    );
    // Consider more specific error handling here
  }
};
