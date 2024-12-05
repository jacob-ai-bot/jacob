import { db } from "~/server/db/db";
import { env } from "~/env";
import {
  EvaluationMode,
  IssueBoardSource,
  type JiraIssue,
  type JiraAccessibleResource,
  type JiraBoard,
  type JiraAttachment,
} from "~/types";
import { type IssueBoard } from "~/server/db/tables/issueBoards.table";
import { refreshGitHubAccessToken } from "../github/tokens";
import { createGitHubIssue, rewriteGitHubIssue } from "../github/issue";
import { uploadToS3, getSignedUrl, IMAGE_TYPE } from "../utils/images";
import { evaluateJiraIssue } from "./evaluateIssue";
const bucketName = process.env.BUCKET_NAME ?? "";

export async function refreshJiraAccessToken(
  accountId: number,
): Promise<string> {
  const account = await db.accounts.find(accountId);
  if (!account?.jiraRefreshToken) {
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
      refresh_token: account.jiraRefreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Jira access token");
  }

  const data = await response.json();
  await db.accounts.find(accountId).update({
    jiraAccessToken: data.access_token,
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
  jiraAccessToken: string,
  cloudId: string,
  projectId: number,
  boardId: string,
  userId: number,
  githubAccessToken: string,
) {
  console.log(`Syncing Jira board ${boardId} for project ${projectId}`);
  const boardResponse = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/${boardId}`,
    {
      headers: {
        Authorization: `Bearer ${jiraAccessToken}`,
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

  await fetchNewJiraIssues({
    jiraAccessToken,
    cloudId,
    projectId,
    boardId,
    userId,
    githubAccessToken,
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

  for (const issueBoard of issueBoards) {
    try {
      // get the user from the issue board
      const account = await db.accounts.findBy({
        userId: issueBoard.createdBy,
      });
      if (!account?.jiraAccessToken) {
        throw new Error("User not found");
      }

      const project = await db.projects.findBy({ id: issueBoard.projectId });
      if (!project?.jiraCloudId) {
        throw new Error("Project not found");
      }
      // check to see if the account's token is expired
      // account.expires_at is a unix timestamp in seconds
      let githubAccessToken: string | undefined = account.access_token;
      if (
        account.expires_at &&
        Date.now() > (account.expires_at as unknown as number) * 1000
      ) {
        githubAccessToken = await refreshGitHubAccessToken(account.userId);
      }
      if (!githubAccessToken) {
        throw new Error("Failed to refresh GitHub access token");
      }
      await fetchNewJiraIssues({
        jiraAccessToken: account.jiraAccessToken,
        cloudId: project.jiraCloudId,
        projectId: issueBoard.projectId,
        boardId: issueBoard.originalBoardId,
        userId: account.userId,
        githubAccessToken,
      });

      // Begin syncing Jira issue statuses with open Todos
      // Fetch all open Todos for the current project
      const openTodos = await db.todos
        .selectAll()
        .where({
          projectId: issueBoard.projectId,
          isArchived: false,
        })
        .whereNotNull("originalIssueId");

      const jiraIssueIds = [];
      const todoIssueMap = new Map();
      for (const todo of openTodos) {
        const originalIssueId = todo.originalIssueId;
        const issue = await db.issues.find(originalIssueId);
        if (issue) {
          const jiraIssueId = issue.issueId;
          jiraIssueIds.push(jiraIssueId);
          if (!todoIssueMap.has(jiraIssueId)) {
            todoIssueMap.set(jiraIssueId, []);
          }
          todoIssueMap.get(jiraIssueId).push(todo.id);
        }
      }

      if (jiraIssueIds.length > 0) {
        const jql = `id in (${jiraIssueIds.join(",")})`;
        const fields = "status";
        const statusResponse = await fetch(
          `https://api.atlassian.com/ex/jira/${project.jiraCloudId}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=${encodeURIComponent(fields)}`,
          {
            headers: {
              Authorization: `Bearer ${account.jiraAccessToken}`,
              Accept: "application/json",
            },
          },
        );

        if (!statusResponse.ok) {
          const errorDetails = await statusResponse.text();
          console.error(
            `Failed to fetch Jira issue statuses: ${statusResponse.statusText} - ${errorDetails}`,
          );
        } else {
          const data = await statusResponse.json();
          for (const jiraIssue of data.issues) {
            const statusName = jiraIssue.fields.status.name;
            if (["Done", "Closed", "Resolved"].includes(statusName)) {
              // Archive associated Todos
              const todoIds = todoIssueMap.get(jiraIssue.id);
              if (todoIds && todoIds.length > 0) {
                for (const todoId of todoIds) {
                  await db.todos.find(todoId).update({ isArchived: true });
                  console.log(
                    `Archived Todo ${todoId} for Jira issue ${jiraIssue.id} with status '${statusName}'`,
                  );
                }
              }
            }
          }
        }
      }
      // End syncing Jira issue statuses with open Todos
    } catch (error) {
      console.error(
        `Error fetching Jira issues for board ${issueBoard.id}:`,
        error,
      );
    }
  }
}

async function downloadAndUploadJiraAttachment(
  attachment: JiraAttachment,
  jiraAccessToken: string,
): Promise<string | null> {
  if (!attachment.mimeType?.startsWith("image/")) {
    return null;
  }

  try {
    const response = await fetch(attachment.content, {
      headers: {
        Authorization: `Bearer ${jiraAccessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to download attachment");
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const imageType =
      attachment.mimeType === "image/jpeg" ? IMAGE_TYPE.JPEG : IMAGE_TYPE.PNG;
    const imagePath = await uploadToS3(
      buffer,
      imageType,
      bucketName,
      `jira-${Date.now()}-${attachment.filename}`,
    );

    return await getSignedUrl(imagePath, bucketName);
  } catch (error) {
    console.error("Error processing attachment:", error);
    return null;
  }
}

export function getJiraUserFacingUrl(apiUrl: string, issueKey: string): string {
  const baseUrl = apiUrl.split("/rest/")[0];
  return `${baseUrl}/browse/${issueKey}`;
}

export async function fetchNewJiraIssues({
  jiraAccessToken,
  cloudId,
  projectId,
  boardId,
  userId,
  githubAccessToken,
  numAttempts = 0,
}: {
  jiraAccessToken: string;
  cloudId: string;
  projectId: number;
  boardId: string;
  userId: number;
  githubAccessToken: string;
  numAttempts?: number;
}) {
  if (numAttempts > 3) {
    throw new Error("Failed to fetch Jira issues");
  }
  const issueBoard = await db.issueBoards.findBy({
    projectId,
    issueSource: IssueBoardSource.JIRA,
    originalBoardId: boardId,
  });

  const project = await db.projects.findBy({ id: projectId });

  try {
    const jql = `project=${boardId} AND created>=-2h`;
    const fields =
      "id,self,summary,description,status,attachment,priority,labels";

    const response = await fetch(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=${encodeURIComponent(fields)}`,
      {
        headers: {
          Authorization: `Bearer ${jiraAccessToken}`,
          Accept: "application/json",
        },
      },
    );

    if (response.status === 401) {
      console.log("Jira access token expired, refreshing...");
      jiraAccessToken = await refreshJiraAccessToken(userId);
      return fetchNewJiraIssues({
        jiraAccessToken,
        cloudId,
        projectId,
        boardId,
        userId,
        githubAccessToken,
        numAttempts: numAttempts + 1,
      });
    }
    if (!response.ok) {
      const errorDetails = await response.text();
      console.error("Error details:", errorDetails);
      throw new Error(`Failed to fetch Jira issues: ${response.statusText}`);
    }
    type OriginalJiraIssue = {
      id: string;
      key: string;
      fields: {
        summary: string;
        description: any;
        status: {
          name: string;
        };
        attachment?: any[];
        priority: {
          iconUrl: string;
        };
        labels?: string[];
      };
      self: string;
    };

    const data = await response.json();

    const issues: JiraIssue[] = data.issues.map((issue: OriginalJiraIssue) => {
      const boardName =
        issue.fields?.priority?.iconUrl?.split("/").slice(0, 3).join("/") ?? "";
      return {
        id: issue.id,
        url: `${boardName}/browse/${issue.key}`,
        key: issue.key,
        number: parseInt(issue.id),
        title: issue.fields.summary,
        description: extractTextFromADF(issue.fields.description),
        status: issue.fields.status.name,
        attachments: issue.fields.attachment ?? [],
        labels: issue.fields.labels ?? [],
      };
    });

    for (const issue of issues) {
      const existingIssue = await db.issues.findByOptional({
        issueBoardId: issueBoard.id,
        issueId: issue.id,
      });

      if (existingIssue) {
        console.log(
          `Repo ${project.repoFullName}: Jira issue ${issue.id} already exists`,
        );
        continue;
      }

      await db.issues.create({
        issueBoardId: issueBoard.id,
        issueId: issue.id,
        title: issue.title,
        jiraIssueDescription: issue.description,
        didCreateGithubIssue: false,
        labels: JSON.stringify(issue.labels ?? []),
      });

      // Evaluate the Jira issue
      const evaluation = await evaluateJiraIssue({
        title: issue.title,
        description: issue.description,
      });

      // Update the issue in the database with evaluation results
      await db.issues
        .findBy({ issueId: issue.id, issueBoardId: issueBoard.id })
        .update({
          evaluationScore: evaluation.score,
          feedback: evaluation.feedback,
        });

      if (evaluation.score < 3) {
        console.log(
          `Jira issue ${issue.key} is not suitable for conversion. Score: ${evaluation.score}`,
        );
        // Optionally, notify the user or log the feedback
        continue;
      }

      console.log(
        `Jira issue ${issue.key} passed evaluation. Proceeding to create GitHub issue.`,
      );

      const owner = project.repoFullName.split("/")[0];
      const repo = project.repoFullName.split("/")[1];
      if (!owner || !repo) {
        throw new Error("Invalid repo full name");
      }

      const imageUrls: string[] = [];
      for (const attachment of issue.attachments ?? []) {
        const imageUrl = await downloadAndUploadJiraAttachment(
          attachment,
          jiraAccessToken,
        );
        if (typeof imageUrl === "string") {
          imageUrls.push(imageUrl);
        }
      }

      const githubIssueDescription = await rewriteGitHubIssue(
        githubAccessToken,
        owner,
        repo,
        issue.title,
        issue.description,
        EvaluationMode.DETAILED,
        imageUrls,
        issue.labels ?? [],
      );

      let githubIssueBody = `[${issue.key}: ${issue.title}](${issue.url})\n\n---\n\n`;
      githubIssueBody += githubIssueDescription.rewrittenIssue;

      if (imageUrls.length > 0) {
        githubIssueBody += "\n\n### Attached Images\n\n";
        imageUrls.forEach((url, index) => {
          githubIssueBody += `![Image ${index + 1}](${url})\n`;
        });
      }

      githubIssueBody += `\n\n---\n\nOriginal Jira issue description: \n\n${issue.title}\n\n${issue.description}`;

      const githubIssue = await createGitHubIssue(
        owner,
        repo,
        issue.title,
        githubIssueBody,
        githubAccessToken,
      );

      console.log(
        `Repo ${project.repoFullName}: Created GitHub issue ${githubIssue.data?.number ?? "Unknown Issue Number"} for Jira issue ${issue.id}`,
      );

      // Update the issue in the database to indicate GitHub issue was created
      await db.issues
        .findBy({ issueId: issue.id, issueBoardId: issueBoard.id })
        .update({
          didCreateGithubIssue: true,
          githubIssueId: githubIssue.data.number,
          fullRepoName: project.repoFullName,
        });
    }
  } catch (error) {
    console.error(`Error fetching Jira issues for board ${boardId}:`, error);
  }
}

export async function getJiraCloudIdResources(accessToken: string) {
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
  return resourcesData;
}

export function extractTextFromADF(adfNode: any): string {
  let text = "";

  if (Array.isArray(adfNode)) {
    for (const node of adfNode) {
      text += extractTextFromADF(node);
    }
  } else if (adfNode && typeof adfNode === "object") {
    if (adfNode.type === "text" && typeof adfNode.text === "string") {
      text += adfNode.text;
    } else if (adfNode.content) {
      text += extractTextFromADF(adfNode.content);
    }
  }

  return text;
}

export async function updateJiraTicketWithTodoLink(
  jiraIssueId: string,
  cloudId: string,
  accessToken: string,
  todoLink: string,
): Promise<void> {
  const message = `📋 JACoB has analyzed this issue, performed some research, and created a plan.

Click here to review the plan →`;
  const commentBody = {
    body: {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [
            {
              text: message,
              type: "text",
            },
            {
              type: "text",
              text: todoLink,
              marks: [
                {
                  type: "link",
                  attrs: {
                    href: todoLink,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  };

  const url = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${encodeURIComponent(jiraIssueId)}/comment`;

  const body = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commentBody),
  };
  const response = await fetch(url, body);

  if (!response.ok) {
    const errorDetails = await response.text();
    console.error(
      `Failed to update Jira ticket. Status: ${response.status}. URL: ${response.url}`,
    );
    throw new Error(
      `Failed to add comment to Jira ticket: ${response.statusText}, ${errorDetails}`,
    );
  } else {
    console.log(`Successfully added comment to Jira ticket ${jiraIssueId}`);
  }
}
