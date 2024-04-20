import { type NextRequest, NextResponse } from "next/server";
import { createOAuthUserAuth } from "@octokit/auth-oauth-user";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") ?? "";

  const redirectUrl =
    process.env.NODE_ENV === "development"
      ? `http://localhost:${process.env.PORT ?? 3000}/auth/github`
      : undefined;

  const auth = createOAuthUserAuth({
    clientId: process.env.GITHUB_CLIENT_ID ?? "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    code,
    // optional
    redirectUrl,
  });

  // Exchanges the code for the user access token authentication on first call
  // and caches the authentication for successive calls
  try {
    const { token } = await auth();

    return NextResponse.json({ data: { token } });
  } catch (error) {
    return NextResponse.json({ errors: [String(error)] }, { status: 500 });
  }
}
