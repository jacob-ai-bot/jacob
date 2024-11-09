import { LinearClient } from "@linear/sdk";
import { db } from "~/server/db/db";
import { env } from "~/env";
import { createGitHubIssue } from "./github";

export async function refreshLinearAccessToken(userId: number): Promise<string> {
  const account = await db.accounts.findBy({ userId });
  if (!account?.linearRefreshToken) {
    throw new Error("No Linear refresh token found");
  }

  const response = await fetch("https://api.linear.app/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
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
  await db.accounts.where({ userId }).update({
    linearAccessToken: data.access_token,
    linearRefreshToken: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000)