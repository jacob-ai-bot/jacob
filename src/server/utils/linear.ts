import { LinearClient } from "@linear/sdk";
import { db } from "~/server/db/db";
import { env } from "~/env";
import { IssueBoardSource, EvaluationMode } from "~/types";
import { type IssueBoard } from "~/server/db/tables/issueBoards.table";
import { refreshGitHubAccessToken } from "../github/tokens";
import { createGitHubIssue, rewriteGitHubIssue } from "../github/issue";

export async function refreshLinearAccessToken(
  accountId: number,
): Promise<string> {
  const account = await db.accounts.findBy({ id: accountId });
  if (!account?.linearRefreshToken) {
    throw new Error("No Linear refresh token found");
  }

  const response = await fetch("https://api.linear.app/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: env.LINEAR_CLIENT_ID,
      client_secret: env.LINEAR_CLIENT_SECRET,
      refresh_token: account.linearRefreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh Linear token: ${response.statusText}`);
  }

  const data = await response.json();
  const { access_token, refresh_token } = data;
  await db.accounts.where({ id: accountId }).update({
    linearAccessToken: access_token,
    linearRefreshToken: refresh_token,
  });

  return access_token;
}

export async function getLinearClient(
  accountId: number,
): Promise<LinearClient> {
  const account = await db.accounts.findBy({ id: accountId });
  if (!account?.linearAccessToken) {
    throw new Error("No Linear access token found");
  }

  return new LinearClient({ accessToken: account.linearAccessToken });
}

export async function fetchLinearTeams(
  accountId: number,
): Promise<{ id: string; name: string }[]> {
  const client = await getLinearClient(accountId);
  const teams = await client.teams();
  return teams.nodes.map((team: { id: string; name: string }) => ({
    id: team.id,
    name: team.name,
  }));
}

export async function syncLinearTeam(
  linearAccessToken: string,
  projectId: number,
  teamId: string,
  userId: number,
  githubAccessToken: string,
) {
  console.log(`Syncing Linear team ${teamId} for project ${projectId}`);

  // Check if the team already exists in issueBoards
  const existingBoard = await db.issueBoards.findByOptional({
    projectId,
    issueSource: IssueBoardSource.LINEAR,
    originalBoardId: teamId,
  });

  if (!existingBoard) {
    const project = await db.projects.findBy({ id: projectId });
    if (!project) {
      throw new Error("Project not found");
    }

    await db.issueBoards.create({
      issueSource: IssueBoardSource.LINEAR,
      projectId,
      originalBoardId: teamId,
      repoFullName: project.repoFullName,
      boardUrl: `https://linear.app/teams/${teamId}`,
      boardName: `Linear Team ${teamId}`,
      createdBy: userId,
    });
  }

  await fetchNewLinearIssues({
    linearAccessToken,
    projectId,
    teamId,
    userId,
    githubAccessToken,
  });

  console.log(`Successfully synced Linear team ${teamId}`);

  return { success: true };
}

export async function fetchAllNewLinearIssues() {
  let issueBoards: IssueBoard[] = [];
  try {
    issueBoards = await db.issueBoards.where({
      issueSource: IssueBoardSource.LINEAR,
    });
  } catch (error: any) {
    console.error(`Error fetching issue boards: ${error.message}`);
    return;
  }

  for (const issueBoard of issueBoards) {
    try {
      const account = await db.accounts.findBy({
        userId: issueBoard.createdBy,
      });
      if (!account?.linearAccessToken) {
        throw new Error("User not found or no Linear access token");
      }

      const project = await db.projects.findBy({ id: issueBoard.projectId });
      if (!project) {
        throw new Error("Project not found");
      }

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

      await fetchNewLinearIssues({
        linearAccessToken: account.linearAccessToken,
        projectId: issueBoard.projectId,
        teamId: issueBoard.originalBoardId,
        userId: account.userId,
        githubAccessToken,
      });
    } catch (error) {
      console.error(
        `Error fetching Linear issues for issueBoard ${issueBoard.id}:`,
        error,
      );
    }
  }
}

export async function fetchNewLinearIssues({
  linearAccessToken,
  projectId,
  teamId,
  userId,
  githubAccessToken,
  numAttempts = 0,
}: {
  linearAccessToken: string;
  projectId: number;
  teamId: string;
  userId: number;
  githubAccessToken: string;
  numAttempts?: number;
}) {
  if (numAttempts > 3) {
    throw new Error("Failed to fetch Linear issues");
  }

  const issueBoard = await db.issueBoards.findBy({
    projectId,
    issueSource: IssueBoardSource.LINEAR,
    originalBoardId: teamId,
  });

  const project = await db.projects.findBy({ id: projectId });

  try {
    const client = new LinearClient({ accessToken: linearAccessToken });
    const issues = await client.issues({
      filter: {
        team: { id: { eq: teamId } },
        createdAt: {
          gt: project?.lastBuildAt
            ? new Date(project.lastBuildAt).toISOString()
            : new Date(0).toISOString(),
        },
      },
    });

    for (const issue of issues?.nodes ?? []) {
      // Check if the issue already exists
      const existingIssue = await db.issues.findByOptional({
        issueBoardId: issueBoard.id,
        issueId: issue.id,
      });

      if (existingIssue) {
        console.log(
          `Repo ${project.repoFullName}: Linear issue ${issue.id} already exists`,
        );
        continue;
      }

      console.log(
        `Repo ${project.repoFullName}: Creating new Linear issue ${issue.id}`,
      );

      // Create a new issue in the database
      await db.issues.create({
        issueBoardId: issueBoard.id,
        issueId: issue.id,
        title: issue.title,
      });

      const owner = project.repoFullName.split("/")[0];
      const repo = project.repoFullName.split("/")[1];
      if (!owner || !repo) {
        throw new Error("Invalid repo full name");
      }

      // Use AI to generate a more detailed GitHub issue description
      const githubIssueDescription = await rewriteGitHubIssue(
        githubAccessToken,
        owner,
        repo,
        issue.title ?? "",
        issue.description ?? "",
        EvaluationMode.DETAILED,
      );
      const githubIssueBody = githubIssueDescription.rewrittenIssue;

      // Create a new GitHub issue
      const githubIssue = await createGitHubIssue(
        owner,
        repo,
        issue.title ?? "",
        githubIssueBody,
        githubAccessToken,
      );

      console.log(
        `Repo ${project.repoFullName}: Created GitHub issue ${githubIssue.data.number} for Linear issue ${issue.id}`,
      );
    }

    await db.projects.where({ id: project.id }).update({
      lastBuildAt: new Date(),
    });
  } catch (error: any) {
    console.error(`Error fetching Linear issues for team ${teamId}:`, error);
    if (error.message.includes("Invalid API key") && numAttempts < 3) {
      console.log("Linear access token expired or invalid, refreshing...");
      const newAccessToken = await refreshLinearAccessToken(userId);
      return fetchNewLinearIssues({
        linearAccessToken: newAccessToken,
        projectId,
        teamId,
        userId,
        githubAccessToken,
        numAttempts: numAttempts + 1,
      });
    }
  }
}
