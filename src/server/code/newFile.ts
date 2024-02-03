import { Issue, Repository } from "@octokit/webhooks-types";

import { getSourceMap, getTypes, getImages } from "../analyze/sourceMap";
import {
  parseTemplate,
  constructNewOrEditSystemPrompt,
  RepoSettings,
  getSnapshotUrl,
} from "../utils";
import { sendGptVisionRequest } from "../openai/request";
import { setNewBranch } from "../git/branch";
import { checkAndCommit } from "./checkAndCommit";
import { saveNewFile } from "../utils/files";

export async function createNewFile(
  newFileName: string,
  repository: Repository,
  token: string,
  issue: Issue,
  rootPath: string,
  repoSettings?: RepoSettings,
) {
  const snapshotUrl = getSnapshotUrl(issue.body);
  const planTemplateParams = {
    newFileName,
    issueBody: issue.body ?? "",
  };

  const planSystemPrompt = parseTemplate(
    "dev",
    "plan_new_file",
    "system",
    planTemplateParams,
  );
  const planUserPrompt = parseTemplate(
    "dev",
    "plan_new_file",
    "user",
    planTemplateParams,
  );
  const plan = (await sendGptVisionRequest(
    planUserPrompt,
    planSystemPrompt,
    snapshotUrl,
    0.2,
  )) as string;

  const sourceMap = getSourceMap(rootPath, repoSettings);
  const types = getTypes(rootPath, repoSettings);
  const images = getImages(rootPath);

  const codeTemplateParams = {
    ...planTemplateParams,
    plan,
    sourceMap,
    types,
    images,
    snapshotUrl: snapshotUrl ?? "",
  };

  const codeSystemPrompt = constructNewOrEditSystemPrompt(
    "code_new_file",
    codeTemplateParams,
    repoSettings,
  );
  const codeUserPrompt = parseTemplate(
    "dev",
    "code_new_file",
    "user",
    codeTemplateParams,
  );
  const code = (await sendGptVisionRequest(
    codeUserPrompt,
    codeSystemPrompt,
    snapshotUrl,
    0.2,
  )) as string;

  if (code.length < 10) {
    console.log(`[${repository.full_name}] code`, code);
    console.log(`[${repository.full_name}] No code generated. Exiting...`);
    throw new Error("No code generated");
  }

  const newBranch = `jacob-issue-${issue.number}-${Date.now()}`;

  await setNewBranch(rootPath, newBranch);

  saveNewFile(rootPath, newFileName, code);

  await checkAndCommit({
    repository,
    token,
    rootPath,
    branch: newBranch,
    repoSettings,
    commitMessage: `JACoB commit for Issue ${issue.number}`,
    issue,
    newPrTitle: `Create ${newFileName}`,
    newPrBody: `## Summary:\n\n${issue.body}\n\n## Plan:\n\n${plan}`,
    newPrReviewers: issue.assignees.map((assignee) => assignee.login),
  });
}
