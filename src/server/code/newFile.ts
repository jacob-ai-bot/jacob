import { Issue, Repository } from "@octokit/webhooks-types";
import fs from "fs";
import path from "path";

import { getSourceMap, getTypes, getImages } from "../analyze/sourceMap";
import { parseTemplate } from "../utils";
import { sendGptRequest } from "../openai/request";
import { setNewBranch } from "../git/branch";
import { addCommitAndPush } from "../git/commit";
import { runBuildCheck } from "../build/node/check";
import { createPR } from "../github/pr";

export async function createNewFile(
  newFileName: string,
  repository: Repository,
  token: string,
  issue: Issue,
  rootPath: string,
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
  );
  const planUserPrompt = parseTemplate(
    "dev",
    "plan_new_file",
    "user",
    planTemplateParams,
  );
  const plan = (await sendGptRequest(
    planUserPrompt,
    planSystemPrompt,
    0.2,
  )) as string;

  const sourceMap = getSourceMap(rootPath);
  const types = getTypes(rootPath);
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
  );
  const codeUserPrompt = parseTemplate(
    "dev",
    "code_new_file",
    "user",
    codeTemplateParams,
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

  const realCode = code.startsWith("```")
    ? code.substring(code.indexOf("\n") + 1)
    : code;

  const newBranch = `otto-issue-${issue.number}-${Date.now()}`;

  await setNewBranch(rootPath, newBranch);

  const targetPath = path.join(rootPath, newFileName);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, realCode);

  await runBuildCheck(rootPath);

  await addCommitAndPush(
    rootPath,
    newBranch,
    `Otto commit for Issue ${issue.number}`,
  );

  await createPR(
    repository,
    token,
    newBranch,
    `Create ${newFileName}`,
    `## Summary:\n\n${issue.body}\n\n## Plan:\n\n${plan}`,
  );
}
