import { refreshToken } from "@octokit/oauth-methods";
import { request } from "@octokit/request";
import { env } from "~/env";
import { db } from "~/server/db/db";

export async function refreshGitHubAccessToken(
  userId: number,
): Promise<string | undefined> {
  try {
    const account = await db.accounts.findBy({ userId });

    if (!account?.access_token || !account?.refresh_token) {
      throw new Error("User not connected to GitHub");
    }
    const url =
      "https://github.com/login/oauth/access_token?" +
      new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: account.refresh_token,
      });

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      method: "POST",
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }
    // update the account with the new access token
    await db.accounts.find(account.id).update({
      access_token: refreshedTokens.access_token,
      expires_at: refreshedTokens.expires_at,
      refresh_token: refreshedTokens.refresh_token,
      refresh_token_expires_in: refreshedTokens.refresh_token_expires_in,
    });

    return refreshedTokens.access_token;
  } catch (error) {
    console.error("Error refreshing access token", error);

    return undefined;
  }
}
