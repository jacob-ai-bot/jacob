import { Issue, Repository } from "@octokit/webhooks-types";
import fs from "fs";
import path from "path";

import { getSourceMap, getTypes, getImages } from "../analyze/sourceMap";
import { parseTemplate, RepoSettings } from "../utils";
import { sendGptRequest } from "../openai/request";
import { setNewBranch } from "../git/branch";
import { checkAndCommit } from "./checkAndCommit";

export async function createNewFile(
  newFileName: string,
  repository: Repository,
  token: string,
  issue: Issue,
  rootPath: string,
  repoSettings?: RepoSettings,
) {
  const planTemplateParams = {
    newFileName,
    issueBody: issue.body ?? "",
  };

  const planSystemPrompt = parseTemplate(
    "dev",
    "plan_new_file",
    "system",
    planTemplateParams,
    repoSettings,
  );
  const planUserPrompt = parseTemplate(
    "dev",
    "plan_new_file",
    "user",
    planTemplateParams,
    repoSettings,
  );
  const plan = (await sendGptRequest(
    planUserPrompt,
    planSystemPrompt,
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
  };

  const codeSystemPrompt = parseTemplate(
    "dev",
    "code_new_file",
    "system",
    codeTemplateParams,
    repoSettings,
  );
  const codeUserPrompt = parseTemplate(
    "dev",
    "code_new_file",
    "user",
    codeTemplateParams,
    repoSettings,
  );
  const code = (await sendGptRequest(
    codeUserPrompt,
    codeSystemPrompt,
    0.2,
  )) as string;

  if (code.length < 10) {
    console.log("code", code);
    console.log("No code generated. Exiting...");
    throw new Error("No code generated");
  }

  // if the first line of the diff starts with ``` then it is a code block. Remove the first line.
  // TODO: move this to the prompt and accept an answer that can be parsed with Zod. If it fails validation, try again with the validation error message.
  const realCode = code.startsWith("```")
    ? code.split("```").slice(1).join("")
    : code;

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
