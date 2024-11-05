import { db } from "~/server/db/db";
import { env } from "~/env";
import { getOrCreateTodo } from "./todos";
import {
  IssueBoardSource,
  type JiraAccessibleResource,
  type JiraBoard,
} from "~/types";
import { type IssueBoard } from "~/server/db/tables/issueBoards.table";

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

export async function fetchJiraProjects(accessToken: string, cloudId: string) {
  const response = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    const errorDetails = await response.text();
    console.error("Error details:", errorDetails);
    throw new Error(`Failed to fetch Jira projects: ${response.statusText}`);
  }

  const data = await response.json();
  return data.values as JiraBoard[];
}

export async function syncJiraBoard(
  accessToken: string,
  cloudId: string,
  projectId: number,
  boardId: string,
  userId: number,
) {
  console.log(`Syncing Jira board ${boardId} for project ${projectId}`);
  const boardResponse = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/${boardId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (!boardResponse.ok) {
    const errorDetails = await boardResponse.text();
    console.error("Error details:", errorDetails);
    throw new Error(
      `Failed to fetch Jira board details: ${boardResponse.statusText}`,
    );
  }

  const boardData: JiraBoard = await boardResponse.json();
  console.log(`Board data: ${JSON.stringify(boardData)}`);

  // first check if the board already exists
  const existingBoard = await db.issueBoards.findByOptional({
    projectId,
    issueSource: IssueBoardSource.JIRA,
    originalBoardId: boardId,
  });

  if (!existingBoard) {
    const project = await db.projects.findBy({ id: projectId });
    if (!project) {
      throw new Error("Project not found");
    }

    await db.issueBoards.create({
      issueSource: IssueBoardSource.JIRA,
      projectId,
      originalBoardId: boardId,
      repoFullName: project.repoFullName,
      boardUrl: boardData.self,
      boardName: boardData.name,
      createdBy: userId,
    });
  }

  console.log(`Fetching new Jira issues for board ${boardId}`);
  await fetchNewJiraIssues({
    accessToken,
    cloudId,
    projectId,
    boardId,
    userId,
  });
  console.log(`Successfully synced Jira board ${boardId}`);

  return { success: true };
}

export async function fetchAllNewJiraIssues() {
  let issueBoards: IssueBoard[] = [];
  try {
    issueBoards = await db.issueBoards.where({
      issueSource: IssueBoardSource.JIRA,
    });
  } catch (error: any) {
    console.error(`Error fetching issue boards: ${error.message}`);
    return;
  }
  console.log(`Found ${issueBoards.length} issue boards`);

  for (const issueBoard of issueBoards) {
    try {
      // get the user from the issue board
      const user = await db.users.findBy({ id: issueBoard.createdBy });
      if (!user?.jiraToken) {
        throw new Error("User not found");
      }
      const project = await db.projects.findBy({ id: issueBoard.projectId });
      if (!project?.jiraCloudId) {
        throw new Error("Project not found");
      }
      await fetchNewJiraIssues({
        accessToken: user.jiraToken,
        cloudId: project.jiraCloudId,
        projectId: issueBoard.projectId,
        boardId: issueBoard.originalBoardId,
        userId: user.id,
      });
      console.log(`Fetched issues for board ${issueBoard.id}`);
    } catch (error) {
      console.error(
        `Error fetching Jira issues for board ${issueBoard.id}:`,
        error,
      );
    }
  }
}

export async function fetchNewJiraIssues({
  accessToken,
  cloudId,
  projectId,
  boardId,
  userId,
  numAttempts = 0,
}: {
  accessToken: string;
  cloudId: string;
  projectId: number;
  boardId: string;
  userId: number;
  numAttempts?: number;
}) {
  if (numAttempts > 3) {
    throw new Error("Failed to fetch Jira issues");
  }

  console.log(`Fetching new Jira issues for board ${boardId}`);
  const issueBoard = await db.issueBoards.findBy({
    projectId,
    issueSource: IssueBoardSource.JIRA,
    originalBoardId: boardId,
  });

  const project = await db.projects.findBy({ id: projectId });

  try {
    const jql = `project=${boardId} AND created>=-12h`;

    const response = await fetch(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search?jql=${encodeURIComponent(jql)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      },
    );

    if (response.status === 401) {
      console.log("Jira access token expired, refreshing...");
      // get the user from the issue board
      accessToken = await refreshJiraAccessToken(userId);
      return fetchNewJiraIssues({
        accessToken,
        cloudId,
        projectId,
        boardId,
        userId,
        numAttempts: numAttempts + 1,
      });
    }
    console.log(`Response status: ${response.status}`);
    if (!response.ok) {
      const errorDetails = await response.text();
      console.error("Error details:", errorDetails);
      throw new Error(`Failed to fetch Jira issues: ${response.statusText}`);
    }

    type JiraIssue = {
      id: string;
      fields: {
        summary: string; // similar to title
        description: string;
      };
    };

    const data = await response.json();
    const issues: JiraIssue[] = data.issues;
    for (const issue of issues) {
      // first check if the issue already exists
      const existingIssue = await db.issues.findByOptional({
        issueBoardId: issueBoard.id,
        issueId: issue.id,
      });

      if (existingIssue) {
        continue;
      }

      console.log(
        `Repo ${project.repoFullName}: Creating new Jira issue ${issue.id}`,
      );
      // create a new issue in the database
      const dbIssue = await db.issues.create({
        issueBoardId: issueBoard.id,
        issueId: issue.id,
        title: issue.fields.summary,
      });

      const todo = await getOrCreateTodo({
        repo: project.repoFullName,
        projectId: project.id,
        issueNumber: parseInt(issue.id),
        jiraIssue: issue,
      });
      if (todo) {
        // update the issue with the todo id
        await db.issues.find(dbIssue.id).update({
          todoId: todo.id,
        });
        console.log(
          `Repo ${project.repoFullName}: Created todo ${todo.id} for Jira issue ${issue.id}`,
        );
      } else {
        throw new Error(`Failed to create todo for issue ${issue.id}`);
      }
    }
  } catch (error) {
    console.error(`Error fetching Jira issues for board ${boardId}:`, error);
  }
}

export async function getJiraCloudIdResources(accessToken: string) {
  // Fetch accessible resources to obtain cloudId
  const resourcesResponse = await fetch(
    "https://api.atlassian.com/oauth/token/accessible-resources",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (!resourcesResponse.ok) {
    throw new Error("Failed to fetch accessible resources");
  }

  const resourcesData: JiraAccessibleResource[] =
    await resourcesResponse.json();

  if (resourcesData.length === 0) {
    throw new Error("No accessible resources found");
  }
  console.log(`Resources data: ${JSON.stringify(resourcesData)}`);
  return resourcesData;
}
