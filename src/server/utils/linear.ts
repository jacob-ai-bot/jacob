import { LinearClient } from "@linear/sdk";
import { db } from "~/server/db/db";
import { env } from "~/env";
import { createGitHubIssue, rewriteGitHubIssue } from "~/server/github/issue";
import { EvaluationMode } from "~/types";

export async function refreshLinearAccessToken(account: {
  linearAccessToken: string | null;
  linearRefreshToken: string | null;
  id: number;
}): Promise<string> {
  if (!account.linearAccessToken) {
    throw new Error("Linear access token not found");
  }

  try {
    const linearClient = new LinearClient({
      accessToken: account.linearAccessToken,
    });
    await linearClient.viewer;
    return account.linearAccessToken;
  } catch (error) {
    if (!account.linearRefreshToken) {
      throw new Error("Linear refresh token not found");
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
      throw new Error("Failed to refresh Linear access token");
    }

    const data = await response.json();
    await db.accounts.update(
      { id: account.id },
      {
        linearAccessToken: data.access_token,
        linearRefreshToken: data.refresh_token,
      },
    );

    return data.access_token;
  }
}

export async function fetchLinearBoards(accessToken: string) {
  const linearClient = new LinearClient({ accessToken });
  const teams = await linearClient.teams();
  return teams.nodes.map((team) => ({
    i