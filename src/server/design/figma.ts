import { Request, Response } from "express";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { createOAuthAppAuth } from "@octokit/auth-oauth-app";

const octokitOAuthApp = new Octokit({
  authStrategy: createOAuthAppAuth,
  auth: {
    clientId: process.env.GITHUB_CLIENT_ID ?? "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
  },
  log: console,
  userAgent: "otto",
});

const octokitApp = new Octokit({
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
    const { status: tokenStatus, data: tokenData } =
      await octokitOAuthApp.rest.apps.checkToken({
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

    const { repo, fileName } = req.body;

    const { status: installationStatus, data: installationData } =
      await octokitApp.rest.apps.getRepoInstallation({
        owner: repo.owner,
        repo: repo.name,
      });

    if (installationStatus < 200 || installationStatus >= 300) {
      throw new Error(`Error ${installationStatus} getting installation`);
    }

    const octokitAppInstallation = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: process.env.GITHUB_APP_ID ?? "",
        privateKey: process.env.GITHUB_PRIVATE_KEY ?? "",
        installationId: installationData.id,
      },
      log: console,
      userAgent: "otto",
    });

    const { status: issueStatus, data: issueData } =
      await octokitAppInstallation.rest.issues.create({
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
    console.error(error);
    res
      .status(500)
      .send(
        JSON.stringify({ errors: [(error as { message: string }).message] }),
      );
  }
};
