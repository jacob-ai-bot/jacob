import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "~/server/auth";
import { db } from "~/server/db/db";

const JIRA_AUTH_URL = "https://auth.atlassian.com/authorize";
const JIRA_TOKEN_URL = "https://auth.atlassian.com/oauth/token";
const CLIENT_ID = process.env.JIRA_CLIENT_ID;
const CLIENT_SECRET = process.env.JIRA_CLIENT_SECRET;
const REDIRECT_URI = "https://app.jacb.ai/api/jira/callback";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.redirect("/login");
  }

  const state = Math.random().toString(36).substring(7);
  const url = new URL(JIRA_AUTH_URL);
  url.searchParams.append("audience", "api.atlassian.com");
  url.searchParams.append("client_id", CLIENT_ID!);
  url.searchParams.append("scope", "read:me");
  url.searchParams.append("redirect_uri", REDIRECT_URI);
  url.searchParams.append("state", state);
  url.searchParams.append("response_type", "code");
  url.searchParams.append("prompt", "consent");

  return NextResponse.redirect(url.toString());
}

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tokenResponse = await fetch(JIRA_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to fetch token");
    }

    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;

    await db.users.update({
      where: { id: session.user.id },
      set: { jiraToken: access_token },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    return NextResponse.json({ error: "Failed to authenticate with Jira" }, { status: 500 });
  }
}
