import { db } from "~/server/db/db";
import { env } from "~/env";
import { getOrCreateTodo } from "./todos";

export async function refreshJiraAccessToken(userId: number): Promise<string> {
  const user = await db.users.findBy({ id: userId });
  if (!user.jiraRefreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: env.JIRA_CLIENT_ID,
      client_secret: env.JIRA_CLIENT_SECRET,
      refresh_token: user.jiraRefreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Jira access token");
  }

  const data = await response.json();
  await db.users.find(userId).update({
    jiraToken: data.access_token,
    jiraRefreshToken: data.refresh_token,
  });

  return data.access_token;
}

export async function fetchJiraBoards(accessToken: string, cloudId: string) {
  const response = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0/board`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Jira boards");
  }

  const data = await response.json();
  return data.values;
}

export async function syncJiraBoard(
  accessToken: string,
  cloudId: string,
  projectId: number,
  boardId: string,
) {
  const boardResponse = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0/board/${boardId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (!boardResponse.ok) {
    throw new Error("Failed to fetch Jira board details");
  }

  const boardData = await boardResponse.json();

  await db.issueSources.create({
    provider: "Jira",
    projectId,
    boardId: boardId,
    boardUrl: boardData.self,
    boardName: boardData.name,
    isActive: true,
  });

  return { success: true };
}

export async function fetchNewJiraIssues() {
  const activeSources = await db.issueSources.findAll({
    where: { provider: "Jira", isActive: true },
  });

  for (const source of activeSources) {
    const project = await db.projects.findBy({ id: source.projectId });
    const user = await db.users.findBy({ id: project.userId });

    if (!user.jiraToken || !user.jiraCloudId) {
      console.error(`User ${user.id} not connected to Jira`);
      continue;
    }

    let accessToken = user.jiraToken;

    try {
      const response = await fetch(
        `https://api.atlassian.com/ex/jira/${user.jiraCloudId}/rest/agile/1.0/board/${source.boardId}/issue?jql=created>=-1h`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        },
      );

      if (response.status === 401) {
        accessToken = await refreshJiraAccessToken(user.id);
        continue; // Retry with new token
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch Jira issues: ${response.statusText}`);
      }

      const data = await response.json();
      for (const issue of data.issues) {
        await getOrCreateTodo({
          repo: project.repoFullName,
          projectId: project.id,
          issueNumber: parseInt(issue.id),
          jiraIssue: issue,
        });
      }
    } catch (error) {
      console.error(
        `Error fetching Jira issues for board ${source.boardId}:`,
        error,
      );
    }
  }
}
