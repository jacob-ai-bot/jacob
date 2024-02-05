import { Request, Response } from "express";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { createOAuthAppAuth } from "@octokit/auth-oauth-app";
import { Endpoints } from "@octokit/types";

import { RepoSettings, IconSet, Style, parseTemplate } from "../utils";
import { sendGptVisionRequest } from "../openai/request";
import { getFile } from "../github/repo";

type GetUserReposResponse = Endpoints["GET /user/repos"]["response"]["data"];
type GitHubRepo = GetUserReposResponse[0];

const octokitOAuthApp = new Octokit({
  authStrategy: createOAuthAppAuth,
  auth: {
    clientId: process.env.GITHUB_CLIENT_ID ?? "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
  },
  log: console,
  userAgent: "jacob",
});

const octokitApp = new Octokit({
  authStrategy: createAppAuth,
  auth: {
    appId: process.env.GITHUB_APP_ID ?? "",
    privateKey: process.env.GITHUB_PRIVATE_KEY ?? "",
  },
  log: console,
  userAgent: "jacob",
});

const auth = createAppAuth({
  appId: process.env.GITHUB_APP_ID ?? "",
  privateKey: process.env.GITHUB_PRIVATE_KEY ?? "",
});

export const newIssueForFigmaFile = async (req: Request, res: Response) => {
  const { verb } = req.params;

  console.log(`newIssueForFigmaFile: ${verb}`);

  if (verb !== "edit" && verb !== "new") {
    res.status(400).send("Invalid verb");
    return;
  }

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

    const { repo, fileName, figmaMap, additionalInstructions, snapshotUrl } =
      req.body as {
        figmaMap?: string;
        fileName?: string;
        additionalInstructions?: string;
        repo?: GitHubRepo;
        snapshotUrl?: string;
      };

    if (!figmaMap || !fileName || !repo) {
      res.status(400).send("Missing required parameters");
      return;
    }

    const { status: installationStatus, data: installationData } =
      await octokitApp.rest.apps.getRepoInstallation({
        owner: repo.owner.login,
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
      userAgent: "jacob",
    });

    const installationAuthentication = await auth({
      type: "installation",
      installationId: installationData.id,
    });

    let repoSettings: RepoSettings | undefined;
    try {
      const { data } = await getFile(
        {
          ...repo,
          owner: {
            ...repo.owner,
            name: repo.owner?.name ?? undefined,
            gravatar_id: repo.owner?.gravatar_id ?? "",
            type: repo.owner?.type as "Bot" | "User" | "Organization",
          },
        },
        installationAuthentication.token,
        "jacob.json",
      );
      if (!(data instanceof Array) && data.type === "file") {
        repoSettings = JSON.parse(atob(data.content));
      }
    } catch (e) {
      /* empty */
    }

    const codeTemplateParams = {
      figmaMap,
      iconSet: repoSettings?.iconSet ?? IconSet.FontAwesome,
      additionalInstructions: additionalInstructions
        ? `Here are some additional instructions: ${additionalInstructions}`
        : "",
      snapshotInstructions: snapshotUrl
        ? "The attached image is a snapshot of the Figma design. Use a combination of the FigML file and the image to produce a pixel-perfect reproduction of this design."
        : "",
    };

    const systemPrompt = parseTemplate(
      "dev",
      "new_figma_file",
      "system",
      codeTemplateParams,
    );

    const userPrompt = parseTemplate(
      "dev",
      "new_figma_file",
      "user",
      codeTemplateParams,
    );

    const code = (await sendGptVisionRequest(
      userPrompt,
      systemPrompt,
      snapshotUrl,
      0.5,
    )) as string;

    const issueTemplateParams = {
      fileName,
      code,
      tailwindInstructions:
        repoSettings?.style === Style.CSS
          ? ""
          : "Specifically, ONLY use valid TailwindCSS classes. For arbitrary values, convert to standard TailwindCSS classes as often as possible. Use the custom Tailwind.config color names if there is an exact match.",
      tailwindBiasInstructions:
        repoSettings?.style === Style.CSS
          ? ""
          : "and other modern TailwindCSS features",
      additionalInstructions: additionalInstructions
        ? `Here are some important additional instructions from the product owner. You MUST follow these instructions, even if it means adjusting the JSX code provided above: \n ${additionalInstructions}`
        : "",
      snapshotUrl: snapshotUrl
        ? `Here is a temporary snapshot of your design. It will expire in 60 minutes for security purposes. \`\`\`![snapshot](${snapshotUrl})\`\`\``
        : "",
    };
    const body = parseTemplate(
      "dev",
      verb === "new" ? "new_figma_file" : "edit_figma_file",
      "body",
      issueTemplateParams,
    );

    const { status: issueStatus, data: issueData } =
      await octokitAppInstallation.rest.issues.create({
        owner: repo.owner.login,
        repo: repo.name,
        assignees: tokenData.user?.login ? [tokenData.user.login] : [],
        title:
          verb === "new"
            ? `Create new file => ${fileName}`
            : `Update the design for ${fileName}`,
        body,
      });

    if (issueStatus < 200 || issueStatus >= 300) {
      throw new Error(`Error ${issueStatus} creating issue`);
    }

    console.log(`[${repo.full_name}] Created issue ${issueData.number}`);

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
