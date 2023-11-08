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
import { addCommentToIssue } from "../github/issue";

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

  // if the first line of the diff starts with ``` then it is a code block. Remove the first line.
  // TODO: move this to the prompt and accept an answer that can be parsed with Zod. If it fails validation, try again with the validation error message.
  const realCode = code.startsWith("```")
    ? code.split("```").slice(1).join("")
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

  const { data: pullRequest } = await createPR(
    repository,
    token,
    newBranch,
    `Create ${newFileName}`,
    `## Summary:\n\n${issue.body}\n\n## Plan:\n\n${plan}`,
    issue.assignees.map((assignee) => assignee.login),
  );

  console.log(`Created PR #${pullRequest.number}: ${pullRequest.html_url}`);

  const prMessage = `Hello human! 👋 \n\nThis PR was created by Otto to address the issue [${issue.title}](${issue.html_url})\n\n## Next Steps\n\n1. Please review the PR carefully. Auto-generated code can and will contain subtle bugs and mistakes.\n\n2. If you identify code that needs to be changed, please reject the PR with a specific reason. Be as detailed as possible in your comments. Otto will take these comments, make changes to the code and push up changes. Please note that this process will take a few minutes.\n\n3. Once the code looks good, approve the PR and merge the code.`;
  await addCommentToIssue(repository, pullRequest.number, token, prMessage);

  const issueMessage = `Good news!\n\nI've completed my work on this issue and have created a pull request: [${pullRequest.title}](${pullRequest.html_url}).\n\nPlease review my changes there.\n`;
  await addCommentToIssue(repository, issue.number, token, issueMessage);
}
