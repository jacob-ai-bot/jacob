import { Request, Response } from "express";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { createBasicAuth } from "@octokit/auth-basic";

const octokit = new Octokit({
  authStrategy: createAppAuth,
  auth: {
    appId: process.env.GITHUB_APP_ID ?? "",
    privateKey: process.env.GITHUB_PRIVATE_KEY ?? "",
  },
  log: console,
  userAgent: "otto",
});

const octokitToken = new Octokit({
  authStrategy: createBasicAuth,
  auth: {
    username: process.env.GITHUB_CLIENT_ID ?? "",
    password: process.env.GITHUB_CLIENT_SECRET ?? "",
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
    const { status: tokenStatus, data: tokenData } =
      await octokitToken.rest.apps.checkToken({
        client_id: process.env.GITHUB_CLIENT_ID ?? "",
        access_token,
      });

    if (tokenStatus < 200 || tokenStatus >= 300) {
      console.log(`Error (${tokenStatus}) checking token: `, tokenData);
      res
        .status(401)
        .send("Unauthorized: Unable to verify GitHub App installation");
    }

    console.log(`Authenticated as ${tokenData.user?.login}`);

    if (!req.body) {
      res.status(400).send("Missing request body");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { repo, fileName, figmaMap, additionalInstructions } = req.body;

    const { status: issueStatus, data: issueData } =
      await octokit.rest.issues.create({
        owner: repo.owner,
        repo: repo.name,
        title: `Create new file => ${fileName}`,
        body: `A new design has been added to Figma for the file ${fileName}.`,
      });

    if (issueStatus < 200 || issueStatus >= 300) {
      throw new Error(`Error ${issueStatus} creating issue`);
    }

    console.log(`Created issue ${issueData.number} in ${repo.full_name}`);

    res.status(200).send(JSON.stringify({ data: { success: true } }));
  } catch (error) {
    res
      .status(500)
      .send(
        JSON.stringify({ errors: [(error as { message: string }).message] }),
      );
  }
};
