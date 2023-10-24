import { Request, Response } from "express";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

const octokit = new Octokit({
  authStrategy: createAppAuth,
  auth: {
    appId: process.env.GITHUB_APP_ID ?? "",
    privateKey: process.env.GITHUB_PRIVATE_KEY ?? "",
  },
  log: console,
  userAgent: "otto",
});

export const newIssueForFigmaFile = async (req: Request, res: Response) => {
  const { verb } = req.params;

  console.log(`newIssueForFigmaFile: ${verb}`);

  const { authorization } = req.headers;
  const access_token: string | undefined = (authorization ?? "")
    .trim()
    .split(" ")[1];

  try {
    const response = await octokit.rest.apps.checkToken({
      client_id: process.env.GITHUB_CLIENT_ID ?? "",
      access_token,
    });

    console.log(`Authenticated as ${response.data.user?.login}`);

    if (!req.body) {
      res.status(400).send("Missing request body");
      return;
    }

    console.log("repo: ", req.body.repo);

    res.status(200).send(JSON.stringify({ data: { success: true } }));
  } catch (error) {
    res
      .status(500)
      .send(
        JSON.stringify({ errors: [(error as { message: string }).message] }),
      );
  }
};
