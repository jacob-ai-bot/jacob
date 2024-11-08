import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { db } from "~/server/db/db";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(
      `${env.NEXTAUTH_URL}/dashboard?error=Missing code or state`,
    );
  }

  const projectId = state.split(":")[1];

  if (!projectId) {
    return NextResponse.redirect(
      `${env.NEXTAUTH_URL}/dashboard?error=Invalid state`,
    );
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
      throw new Error("Failed to exchange code for token");
    }

    const tokenData = await tokenResponse.json();
    const { access_token: accessToken, refresh_token: refreshToken } =
      tokenData;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error("User not authenticated");
    }

    const userId = session.user.id;

    await db.accounts.where({ userId }).update({
      linearAccessToken: accessToken,
      linearRefreshToken: refreshToken,
    });

    const project = await db.projects.findOne({ id: parseInt(projectId) });
    if (!project) {
      throw new Error("Project not found");
    }

    return NextResponse.redirect(
      `${env.NEXTAUTH_URL}/dashboard/${project.repoFullName.split("/")[0]}/${
        project.repoFullName.split("/")[1]
      }/settings`,
    );
  } catch (error) {
    console.error("Error in Linear OAuth callback:", error);
    return NextResponse.redirect(
      `${env.NEXTAUTH_URL}/dashboard?error=Failed to authenticate with Linear`,
    );
  }
}
