import { LinearClient } from "@linear/sdk";
import { db } from "~/server/db/db";
import { env } from "~/env";
import { createIssue } from "~/server/utils/issues";

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
  const { access_token, refresh_token, expires_in } = data;

  const expiresAt = new Date(Date.now() + expires_in * 1000);

  await db.accounts.where({ id: accountId }).update({
    linearAccessToken: access_token,
    linearRefreshToken: refresh_token,
    linearTokenExpiresAt: expiresAt,
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

  if (
    account.linearTokenExpiresAt &&
    account.linearTokenExpiresAt < new Date()
  ) {
    account.linearAccessToken = await refreshLinearAccessToken(accountId);
  }

  return new LinearClient({ accessToken: account.linearAccessToken });
}

export async function fetchAllNewLinearIssues(): Promise<void> {
  const projects = await db.projects.findAll({
    where: { linearBoardId: { isNot: null } },
  });

  for (const project of projects) {
    if (!project.linearBoardId) continue;

    const account = await db.accounts.findBy({ userId: project.id });
    if (!account) continue;

    try {
      const client = await getLinearClient(account.id);
      const issues = await client.issues({
        filter: {
          team: { id: { eq: project.linearBoardId } },
          createdAt: { gt: project.lastBuildAt ?? new Date(0) },
        },
      });

      for (const issue of issues.nodes) {
        await createIssue({
          projectId: project.id,
          title: issue.title,
          body: issue.description ?? "",
          externalId: issue.id,
          externalType: "linear",
        });
      }

      await db.projects.where({ id: project.id }).update({
        lastBuildAt: new Date(),
      });
    } catch (error) {
      console.error(
        `Error fetching Linear issues for project ${project.id}:`,
        error,
      );
    }
  }
}

export async function getLinearBoards(
  accountId: number,
): Promise<{ id: string; name: string }[]> {
  const client = await getLinearClient(accountId);
  const teams = await client.teams();
  return teams.nodes.map((team) => ({ id: team.id, name: team.name }));
}
