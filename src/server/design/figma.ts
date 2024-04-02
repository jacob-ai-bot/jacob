import dedent from "ts-dedent";
import { Request, Response } from "express";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { createOAuthAppAuth } from "@octokit/auth-oauth-app";
import { Endpoints } from "@octokit/types";
import semver from "semver";
import path from "path";

import { RepoSettings, parseTemplate } from "../utils";
import { IconSet, Style, Language } from "../utils/settings";
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

const iconSetExamples = {
  [IconSet.FontAwesome]: dedent`
    \`\`\`jsx
    import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
    import { faEnvelope } from '@fortawesome/free-solid-svg-icons'
    const element = <FontAwesomeIcon icon={faEnvelope} />
    \`\`\`
  `,
  [IconSet.Heroicons]: dedent`
    \`\`\`jsx
    import { BeakerIcon } from '@heroicons/react/24/solid'
    const element = <BeakerIcon className="h-6 w-6 text-blue-500"/>
    \`\`\`
  `,
  [IconSet.Unicons]: dedent`
    \`\`\`jsx
    import { UilEnvelope } from '@iconscout/react-unicons'
    const element = <UilEnvelope size="24" color="#000"/>
    \`\`\`
  `,
  [IconSet.ReactFeather]: dedent`
    \`\`\`jsx
    import { Camera } from 'react-feather'
    const element = <Camera />
    \`\`\`
  `,
  [IconSet.MaterialUI]: dedent`
    \`\`\`jsx
    import { AccessAlarm } from '@material-ui/icons';
    const element = <AccessAlarm />
    \`\`\`
  `,
  [IconSet.StyledIcons]: dedent`
    \`\`\`jsx
    import { Lock } from '@styled-icons/material'
    const element = <Lock />
    \`\`\`
  `,
  [IconSet.IconPark]: dedent`
    \`\`\`jsx
    import { Email } from '@icon-park/react'
    const element = <Email />
    \`\`\`
  `,
  [IconSet.CoreUI]: dedent`
    \`\`\`jsx
    import { CilEnvelopeOpen } from '@coreui/icons-react'
    const element = <CilEnvelopeOpen />
    \`\`\`
  `,
  [IconSet.Iconify]: dedent`
    \`\`\`jsx
    import { Icon } from '@iconify/react'
    import envelopeIcon from '@iconify-icons/mdi/envelope'
    const element = <Icon icon={envelopeIcon} />
    \`\`\`
  `,
  [IconSet.Lucide]: dedent`
    \`\`\`jsx
    import { LayoutDashboard } from 'lucide-react'
    const element = <LayoutDashboard />
    \`\`\`
  `,
};

function generatePreferredFileName(
  specifiedFileName: string | undefined,
  fileName: string,
  newFileType: string | undefined,
  nextAppRouter: boolean,
) {
  if (!specifiedFileName) {
    return fileName;
  }
  if (specifiedFileName.includes("/")) {
    return specifiedFileName;
  }
  const nameWithoutSpaces = specifiedFileName.replace(/ /g, "-");

  return nextAppRouter &&
    newFileType === "page" &&
    !nameWithoutSpaces.endsWith(".tsx") &&
    !nameWithoutSpaces.endsWith(".jsx")
    ? `${nameWithoutSpaces}/page`
    : nameWithoutSpaces;
}

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

    const {
      repo,
      specifiedFileName,
      fileName,
      newFileType,
      figmaMap,
      figmaMapCSS,
      additionalInstructions,
      snapshotUrl,
      imageUrls,
    } = req.body as {
      figmaMap?: string;
      figmaMapCSS?: string;
      specifiedFileName?: string;
      fileName?: string;
      newFileType?: string;
      additionalInstructions?: string;
      repo?: GitHubRepo;
      snapshotUrl?: string;
      imageUrls?: string[];
    };

    // TODO: require figmaMapCSS once new plugin is widely in use
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

    const getRepoContent = (repoPath: string) =>
      getFile(
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
        repoPath,
      );

    const getRepoFileContent = async (repoPath: string) => {
      try {
        const { data } = await getRepoContent(repoPath);
        if (!(data instanceof Array) && data.type === "file") {
          return JSON.parse(atob(data.content));
        }
      } catch (e) {
        /* empty */
      }
    };

    const isRepoDirPresent = async (repoPath: string) => {
      try {
        const { data } = await getRepoContent(repoPath);
        return data instanceof Array;
      } catch (e) {
        return false;
      }
    };

    const repoSettings = (await getRepoFileContent("jacob.json")) as
      | RepoSettings
      | undefined;
    const parsedPackageJson = (await getRepoFileContent("package.json")) as  // eslint-disable-next-line @typescript-eslint/no-explicit-any
      | Record<string, any>
      | undefined;
    const nextVersion = parsedPackageJson?.dependencies?.next;
    const nextMinVersion = semver.validRange(nextVersion)
      ? semver.minVersion(nextVersion)
      : null;
    const nextMajorVersion =
      semver.valid(nextMinVersion) && nextMinVersion
        ? semver.major(nextMinVersion)
        : 0;
    let nextAppRouter = false;
    let nextPagesDir = "src/pages";
    if (nextMajorVersion >= 13) {
      if (await isRepoDirPresent("app")) {
        nextPagesDir = "app";
        nextAppRouter = true;
      } else if (await isRepoDirPresent("src/app")) {
        nextPagesDir = "src/app";
        nextAppRouter = true;
      }
    }
    const nextComponentsDir = nextAppRouter
      ? `${nextPagesDir}/_components`
      : "src/components";
    const preferredFileName = generatePreferredFileName(
      specifiedFileName,
      fileName,
      newFileType,
      nextAppRouter,
    );
    const updatedFileName =
      preferredFileName.endsWith(".jsx") || preferredFileName.endsWith(".tsx")
        ? preferredFileName
        : repoSettings?.language === Language.JavaScript
        ? `${preferredFileName}.jsx`
        : `${preferredFileName}.tsx`;

    const componentsDir =
      repoSettings?.directories?.components ?? nextComponentsDir;
    const pagesDir = repoSettings?.directories?.pages ?? nextPagesDir;

    let fullNewFileName;
    switch (newFileType) {
      case "page":
        fullNewFileName = path.join(pagesDir, updatedFileName);
        break;
      case "component":
        fullNewFileName = path.join(componentsDir, updatedFileName);
        break;
      default:
        fullNewFileName = updatedFileName;
    }

    const iconSet = repoSettings?.iconSet ?? IconSet.FontAwesome;
    const iconSetExample = iconSetExamples[iconSet];

    const figmlExample = parseTemplate(
      "dev",
      repoSettings?.style === Style.CSS
        ? "new_figma_file_css"
        : "new_figma_file_tailwind",
      "figml",
      {},
    );

    const styleInstructions = parseTemplate(
      "dev",
      repoSettings?.style === Style.CSS
        ? "new_figma_file_css"
        : "new_figma_file_tailwind",
      "instructions",
      {},
    );

    const codeTemplateParams = {
      figmaMap:
        repoSettings?.style === Style.CSS && figmaMapCSS
          ? figmaMapCSS
          : figmaMap,
      figmlExample,
      styleInstructions,
      iconSet,
      language: repoSettings?.language ?? "TypeScript",
      styleQualifier: repoSettings?.style === Style.CSS ? "CSS" : "TailwindCSS",
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
      fileName: fullNewFileName,
      code,
      iconSet,
      iconSetExample,
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
        ? `\nHere is a temporary snapshot of your design. It will expire in 60 minutes for security purposes.\n![snapshot](${snapshotUrl})\n`
        : "",
      imageUrls: imageUrls
        ? "\nHere are the images from your design. These images will be downloaded to this branch and these links will expire in 60 minutes for security purposes.\n" +
          imageUrls.map((url) => `![image](${url})`).join("\n")
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
            ? `Create new file => ${fullNewFileName}`
            : `Update the design for ${updatedFileName}`,
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
