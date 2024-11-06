import { NextResponse } from "next/server";
import { getServerAuthSession } from "~/server/auth";
import { refreshGitHubAccessToken } from "~/server/github/tokens";

export async function GET() {
  try {
    const { user } = (await getServerAuthSession()) ?? {};

    if (!user) {
      return NextResponse.json({ errors: ["Unauthorized"] }, { status: 401 });
    }
    const userId = parseInt(user.id);

    const newAccessToken = await refreshGitHubAccessToken(userId);
    if (!newAccessToken) {
      return NextResponse.json(
        { errors: ["Failed to refresh GitHub access token"] },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ errors: [String(error)] }, { status: 500 });
  }
}
