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
import { archiveTodosByIssueId } from "./todos";
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
  console.log("fetching all new jira issues");
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

      // Fetch open todos for this project
      const openTodos = await db.todos.where({
        projectId: issueBoard.projectId,
        isArchived: false,
      });

      for (const todo of openTodos) {
        if (!todo.originalIssueId) continue;

        const issue = await db.issues.findBy({ id: todo.originalIssueId });
        if (!issue) continue;
        const jiraResponse = await fetch(
          `https://api.atlassian.com/ex/jira/${project.jiraCloudId}/rest/api/3/issue/${issue.issueId}`,
          {
            headers: {
              Authorization: `Bearer ${account.jiraAccessToken}`,
              Accept: "application/json",
            },
          },
        );
        if (!jiraResponse.ok) continue;
        const jiraIssue = await jiraResponse.json();
        if (
          jiraIssue.fields.status.name === "Done" ||
          jiraIssue.fields.status.name === "Closed"
        ) {
          if (todo.issueId) {
            await archiveTodosByIssueId(todo.issueId, issueBoard.projectId);
          } else {
            console.log("todo has no issueId, skipping");
          }
        }
      }

      await fetchNewJiraIssues({
        jiraAccessToken: account.jiraAccessToken,
        cloudId: project.jiraCloudId,
        projectId: issueBoard.projectId,
        boardId: issueBoard.originalBoardId,
        userId: account.userId,
        githubAccessToken,
      });
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
    const recentIssuesJql = `project=${boardId} AND created>=-2h`;
    const manuallyTaggedIssuesJql = `project=${boardId} AND (labels in ("jacob") OR labels in ("Jacob") OR description ~ "@jacob" OR description ~ "#jacob" OR description ~ "@Jacob" OR description ~ "#Jacob")`;
    const fields =
      "id,self,summary,description,status,attachment,priority,labels,issuetype";

    let recentIssues: JiraIssue[] = [];
    let manuallyTaggedIssues: JiraIssue[] = [];

    try {
      recentIssues = await fetchIssuesFromJira(
        jiraAccessToken,
        cloudId,
        recentIssuesJql,
        fields,
      );
    } catch (error: any) {
      if (error.message === "Unauthorized") {
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
      } else {
        throw error;
      }
    }

    try {
      manuallyTaggedIssues = await fetchIssuesFromJira(
        jiraAccessToken,
        cloudId,
        manuallyTaggedIssuesJql,
        fields,
      );
    } catch (error: any) {
      if (error.message === "Unauthorized") {
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
      } else {
        throw error;
      }
    }

    const combinedIssuesMap = new Map<string, JiraIssue>();
    for (const issue of [...recentIssues, ...manuallyTaggedIssues]) {
      combinedIssuesMap.set(issue.id, issue);
    }
    const issues = Array.from(combinedIssuesMap.values());

    for (const issue of issues) {
      const existingIssue = await db.issues.findByOptional({
        issueBoardId: issueBoard.id,
        issueId: issue.id,
      });

      const isManuallyTagged =
        issue.labels.some((label) => label.toLowerCase() === "jacob") ||
        /@jacob|#jacob/i.test(issue.description);

      if (existingIssue) {
        if (isManuallyTagged && !existingIssue.didCreateGithubIssue) {
          console.log(
            `Repo ${project.repoFullName}: Jira issue ${issue.id} already exists, but is manually tagged and has not created a GitHub issue yet`,
          );
        } else {
          console.log(
            `Repo ${project.repoFullName}: Jira issue ${issue.id} already exists`,
          );
          continue;
        }
      }

      const ticketType = issue.ticketType;

      await db.issues.create({
        issueBoardId: issueBoard.id,
        issueId: issue.id,
        title: issue.title,
        jiraIssueDescription: issue.description,
        didCreateGithubIssue: false,
        labels: JSON.stringify(issue.labels ?? []),
        ticketType: ticketType,
      });

      let evaluationScore: number;
      let feedback: string | undefined;

      if (isManuallyTagged) {
        evaluationScore = 5;
        feedback = "manually tagged for jacob";
      } else {
        const evaluation = await evaluateJiraIssue({
          title: issue.title,
          description: issue.description,
        });
        evaluationScore = evaluation.score;
        feedback = evaluation.feedback;
      }

      await db.issues
        .findBy({ issueId: issue.id, issueBoardId: issueBoard.id })
        .update({
          evaluationScore: evaluationScore,
          feedback: feedback,
        });

      if (evaluationScore < 3) {
        console.log(
          `Jira issue ${issue.key} is not suitable for conversion. Score: ${evaluationScore}`,
        );
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

      const labels = [...(issue.labels ?? [])];
      if (ticketType) {
        const label = ticketType.toLowerCase();
        if (!labels.includes(label)) {
          labels.push(label);
        }
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
        labels,
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
        `Repo ${project.repoFullName}: Created GitHub issue ${
          githubIssue.data?.number ?? "Unknown Issue Number"
        } for Jira issue ${issue.id}`,
      );

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

async function fetchIssuesFromJira(
  jiraAccessToken: string,
  cloudId: string,
  jql: string,
  fields: string,
): Promise<JiraIssue[]> {
  const response = await fetch(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search?jql=${encodeURIComponent(
      jql,
    )}&fields=${encodeURIComponent(fields)}`,
    {
      headers: {
        Authorization: `Bearer ${jiraAccessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (response.status === 401) {
    throw new Error("Unauthorized");
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
      issuetype: {
        name: string;
      };
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
      status: issue.fields.status.name,
      description: extractTextFromADF(issue.fields.description),
      attachments: issue.fields.attachment ?? [],
      labels: issue.fields.labels ?? [],
      ticketType: issue.fields.issuetype.name,
    };
  });

  return issues;
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

  const url = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${encodeURIComponent(
    jiraIssueId,
  )}/comment`;

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
