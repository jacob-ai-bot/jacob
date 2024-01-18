import { Issue, Repository } from "@octokit/webhooks-types";
import fs from "fs";
import path from "path";

import { getSourceMap, getTypes, getImages } from "../analyze/sourceMap";
import {
  parseTemplate,
  constructNewOrEditSystemPrompt,
  RepoSettings,
} from "../utils";
import { sendGptRequest } from "../openai/request";
import { setNewBranch } from "../git/branch";
import { checkAndCommit } from "./checkAndCommit";

export async function createNewFile(
  newFileName: string,
  repository: Repository,
  token: string,
  issue: Issue,
  rootPath: string,
  repoSettings?: RepoSettings
) {
  const planTemplateParams = {
    newFileName,
    issueBody: issue.body ?? "",
  };

  const planSystemPrompt = parseTemplate(
    "dev",
    "plan_new_file",
    "system",
    planTemplateParams
  );
  const planUserPrompt = parseTemplate(
    "dev",
    "plan_new_file",
    "user",
    planTemplateParams
  );
  const plan = (await sendGptRequest(
    planUserPrompt,
    planSystemPrompt,
    0.2
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
  };

  const codeSystemPrompt = constructNewOrEditSystemPrompt(
    "code_new_file",
    codeTemplateParams,
    repoSettings
  );
  const codeUserPrompt = parseTemplate(
    "dev",
    "code_new_file",
    "user",
    codeTemplateParams
  );
  const code = (await sendGptRequest(
    codeUserPrompt,
    codeSystemPrompt,
    0.2
  )) as string;

  if (code.length < 10) {
    console.log(`[${repository.full_name}] code`, code);
    console.log(`[${repository.full_name}] No code generated. Exiting...`);
    throw new Error("No code generated");
  }

  // if a line of the code starts with ``` then it is a code block delimiter from GPT. Remove these lines.
  const realCode = code.replace(/^```.*$/gm, "");

  const newBranch = `jacob-issue-${issue.number}-${Date.now()}`;

  await setNewBranch(rootPath, newBranch);

  const targetPath = path.join(rootPath, newFileName);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, realCode);

  await checkAndCommit({
    repository,
    token,
    rootPath,
    branch: newBranch,
    commitMessage: `JACoB commit for Issue ${issue.number}`,
    issue,
    newPrTitle: `Create ${newFileName}`,
    newPrBody: `## Summary:\n\n${issue.body}\n\n## Plan:\n\n${plan}`,
    newPrReviewers: issue.assignees.map((assignee) => assignee.login),
  });
}
