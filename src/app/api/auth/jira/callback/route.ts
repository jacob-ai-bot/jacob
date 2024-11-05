import { type NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "~/server/auth";
import { db } from "~/server/db/db";
import { env } from "~/env";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return NextResponse.json(
        { error: "Missing code or state" },
        { status: 400 },
      );
    }
    // the projectId is the last part of the state: jiraOAuthState-<random>-<projectId>
    const projectIdString = state?.split("-")[2];

    if (!projectIdString || isNaN(parseInt(projectIdString))) {
      return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
    }

    const projectId = parseInt(projectIdString);

    console.log(`Project ID: ${projectId}`);
    // the state is stored in session storage
    // const storedState = sessionStorage.getItem("jiraOAuthState");
    // Validate state (you should implement a proper state validation mechanism)
    // This is a placeholder for demonstration purposes
    // if (state !== "your_stored_state") {
    //   return NextResponse.json({ error: "Invalid state" }, { status: 400 });
    // }

    const tokenResponse = await fetch(
      "https://auth.atlassian.com/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grant_type: "authorization_code",
          client_id: env.JIRA_CLIENT_ID,
          client_secret: env.JIRA_CLIENT_SECRET,
          code: code,
          redirect_uri: `${env.NEXTAUTH_URL}/api/auth/jira/callback`,
        }),
      },
    );

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for token");
    }

    const tokenData = await tokenResponse.json();
    console.log(`Token data: ${JSON.stringify(tokenData)}`);
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 },
      );
    }

    const userId = parseInt(session.user.id);

    await db.users.find(userId).update({
      jiraToken: accessToken,
      jiraRefreshToken: refreshToken,
    });

    const project = await db.projects.find(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.redirect(
      `${env.NEXTAUTH_URL}/dashboard/${project.repoFullName}/settings`,
    );
  } catch (error) {
    console.error("Error in Jira OAuth callback:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
