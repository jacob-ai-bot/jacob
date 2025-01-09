import { NextResponse } from "next/server";
import { exchangeZendeskCodeForToken } from "~/server/utils/zendesk";
import { db } from "~/server/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "~/server/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect("/auth/error");
  }

  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.redirect("/auth/error");
  }

  const userId = session.user.id;

  try {
    const tokens = await exchangeZendeskCodeForToken(code, userId);

    await db.accounts.update(
      {
        zendeskAccessToken: tokens.access_token,
        zendeskRefreshToken: tokens.refresh_token,
        zendeskUsername: tokens.username,
      },
      { where: { userId } },
    );

    return NextResponse.redirect("/dashboard");
  } catch (error) {
    console.error("Zendesk OAuth callback error:", error);
    return NextResponse.redirect("/auth/error");
  }
}
