import { Request, Response } from "express";
import { createOAuthUserAuth } from "@octokit/auth-oauth-user";

export async function gitHubOAuthCallback(req: Request, res: Response) {
  const { code } = req.query;

  const redirectUrl =
    process.env.NODE_ENV === "development"
      ? `http://localhost:${process.env.PORT ?? 5173}/auth/github`
      : undefined;

  const auth = createOAuthUserAuth({
    clientId: process.env.GITHUB_CLIENT_ID ?? "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    code: String(code),
    // optional
    redirectUrl,
  });

  // Exchanges the code for the user access token authentication on first call
  // and caches the authentication for successive calls
  try {
    const { token } = await auth();

    res.status(200).json({ data: { token } });
  } catch (error) {
    res.status(500).json({ errors: [JSON.stringify(error)] });
  }
}
