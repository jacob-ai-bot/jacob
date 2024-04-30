import { type Repository } from "@octokit/webhooks-types";
import { type Endpoints } from "@octokit/types";
import { dedent } from "ts-dedent";
import fs from "fs";
import path from "path";

import { getTypes } from "../analyze/sourceMap";
import { checkAndCommit } from "./checkAndCommit";
import { getIssue } from "../github/issue";
import {
  extractFilePathWithArrow,
  parseTemplate,
  type RepoSettings,
  type BaseEventData,
  getSnapshotUrl,
} from "../utils";
import { sendGptVisionRequest } from "../openai/request";
import { saveNewFile } from "../utils/files";
import { Language } from "../utils/settings";

export type PullRequest =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];

export interface CreateStoryParams extends BaseEventData {
  repository: Repository;
  token: string;
  rootPath: string;
  branch: string;
  repoSettings?: RepoSettings;
  existingPr: PullRequest;
}

export async function createStory(params: CreateStoryParams) {
  const {
    repository,
    token,
    rootPath,
    branch,
    repoSettings,
    existingPr,
    ...baseEventData
  } = params;
  const regex = /jacob-issue-(\d+)-.*/;
  const match = branch.match(regex);
  const issueNumber = parseInt(match?.[1] ?? "", 10);
  const result = await getIssue(repository, token, issueNumber);
  console.log(
    `[${repository.full_name}] Loaded Issue #${issueNumber} associated with PR #${existingPr?.number}`,
  );
  const issue = result.data;

  const newFileName = extractFilePathWithArrow(issue.title);
  const newFileExtension = newFileName ? path.extname(newFileName) : "";
  if (!newFileName || !newFileExtension) {
    throw new Error(
      "createStory: Unable to extract file name and extension from issue title",
    );
  }
  const storybookFilename = newFileName.replace(
    newFileExtension,
    `.stories${newFileExtension}`,
  );
  const componentCode = fs.readFileSync(
    path.join(rootPath, newFileName),
    "utf8",
  );
  const types = getTypes(rootPath, repoSettings);

  const exampleStory = parseTemplate(
    "dev",
    "create_story_example",
    repoSettings?.language === Language.JavaScript
      ? "javascript"
      : "typescript",
    { size: "${size}" }, // Because the files contain a ${size} that should not be replaced
  );

  const storyTemplateParams = {
    newFileName,
    storybookFilename,
    types,
    exampleStory,
    componentCode,
    language: repoSettings?.language ?? "TypeScript",
    languageInstructions:
      repoSettings?.language == Language.JavaScript
        ? ""
        : dedent`
          As in the example, be sure to define to include the line \`type Story = StoryObj<typeof meta>;\`
          DO NOT use the 'any' type because this will result in TypeScript build errors.    
        `,
  };
  const snapshotUrl = getSnapshotUrl(issue.body);

  const storySystemPrompt = parseTemplate(
    "dev",
    "create_story",
    "system",
    storyTemplateParams,
  );
  const storyUserPrompt = parseTemplate(
    "dev",
    "create_story",
    "user",
    storyTemplateParams,
  );
  const storybookCode =
    (await sendGptVisionRequest(
      storyUserPrompt,
      storySystemPrompt,
      snapshotUrl,
      0.2,
      baseEventData,
    )) ?? "";

  saveNewFile(rootPath, storybookFilename, storybookCode);

  await checkAndCommit({
    repository,
    token,
    rootPath,
    branch,
    commitMessage: `JACoB commit: add storybook story ${storybookFilename}`,
    existingPr,
    repoSettings,
    creatingStory: true,
  });
}
