import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { db } from "~/server/db/db";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing code or state" },
      { status: 400 },
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tokenResponse = await fetch("https://api.linear.app/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: env.LINEAR_CLIENT_ID,
        client_secret: env.LINEAR_CLIENT_SECRET,
        code: code,
        redirect_uri: `${env.NEXTAUTH_URL}/api/auth/linear/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(
        `Failed to exchange code for token: ${tokenResponse.statusText}`,
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    const expiresAt = new Date(Date.now() + expires_in * 1000);

    await db.accounts.where({ userId: session.user.id }).update({
      linearAccessToken: access_token,
      linearRefreshToken: refresh_token,
      linearTokenExpiresAt: expiresAt,
    });

    const projectId = url.searchParams.get("state");
    if (!projectId) {
      throw new Error("Missing project ID in state");
    }

    const project = await db.projects.findBy({ id: parseInt(projectId, 10) });
    if (!project) {
      throw new Error("Project not found");
    }

    return NextResponse.redirect(
      `${env.NEXTAUTH_URL}/dashboard/${project.repoFullName}/settings`,
    );
  } catch (error) {
    console.error("Error in Linear OAuth callback:", error);
    return NextResponse.json(
      { error: "Failed to process Linear OAuth callback" },
      { status: 500 },
    );
  }
}
