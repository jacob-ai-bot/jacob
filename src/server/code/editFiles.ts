import { type Issue, type Repository } from "@octokit/webhooks-types";

import { getTypes, getImages } from "../analyze/sourceMap";
import {
  parseTemplate,
  constructNewOrEditSystemPrompt,
  type RepoSettings,
  type BaseEventData,
  getStyles,
  generateJacobBranchName,
} from "../utils";
import { concatenateFiles, reconstructFiles } from "../utils/files";
import {
  countTokens,
  MAX_OUTPUT,
  type Model,
  sendGptRequest,
  sendGptRequestWithSchema,
} from "../openai/request";
import { setNewBranch } from "../git/branch";
import { checkAndCommit } from "./checkAndCommit";
import { saveImages } from "../utils/images";
import {
  ExtractedIssueInfoSchema,
  type ExtractedIssueInfo,
} from "./extractedIssue";
import { emitCodeEvent } from "../utils/events";
import { getSnapshotUrl } from "~/app/utils";
import { db } from "../db/db";

export interface EditFilesParams extends BaseEventData {
  repository: Repository;
  token: string;
  issue: Issue;
  rootPath: string;
  sourceMap: string;
  repoSettings?: RepoSettings;
}

export async function editFiles(params: EditFilesParams) {
  const {
    repository,
    token,
    issue,
    rootPath,
    sourceMap,
    repoSettings,
    ...baseEventData
  } = params;
  const snapshotUrl = getSnapshotUrl(issue.body);
  // When we start processing PRs, need to handle appending additionalComments
  const issueBody = issue.body ? `\n${issue.body}` : "";

  // If there is research available, add it to the issue text
  const researchData = await db.research.where({ issueId: issue.number }).all();
  const codebaseInformation =
    researchData
      .map((item) => `Question: ${item.question}\nAnswer: ${item.answer}`)
      .join("\n\n") ?? sourceMap;

  const initialIssueText = `${issue.title}${issueBody}}`;

  // use o1-mini to generate a plan
  const o1Prompt = `Here is a Github Issue:\n
  <issue>${initialIssueText}</issue>\n
  Here is some information about the codebase that may be relevant:\n
  <codebase-information>${codebaseInformation}</codebase-information>\n
  Generate a straightforward plan for how to resolve this issue while making changes to as few files as possible. 
  Be concise and specific, providing a step-by-step guide for the developer.`;

  const o1Plan = await sendGptRequest(
    o1Prompt,
    "",
    1,
    undefined,
    3,
    60000,
    null,
    "o1-mini-2024-09-12",
  );
  const issueText = `${initialIssueText}\n\nPlan:\n${o1Plan}`;

  const extractedIssueTemplateParams = {
    sourceMap,
    issueText,
  };

  const extractedIssueSystemPrompt = parseTemplate(
    "dev",
    "extracted_issue",
    "system",
    extractedIssueTemplateParams,
  );
  const extractedIssueUserPrompt = parseTemplate(
    "dev",
    "extracted_issue",
    "user",
    extractedIssueTemplateParams,
  );
  const extractedIssue = (await sendGptRequestWithSchema(
    extractedIssueUserPrompt,
    extractedIssueSystemPrompt,
    ExtractedIssueInfoSchema,
    0.2,
    baseEventData,
  )) as ExtractedIssueInfo;

  // TODO: handle previousAssessments
  const filesToUpdate = extractedIssue.filesToUpdate ?? [];
  const filesToCreate = extractedIssue.filesToCreate ?? [];

  console.log(`[${repository.full_name}] Files to update:`, filesToUpdate);
  console.log(`[${repository.full_name}] Files to create:`, filesToCreate);
  if (!filesToUpdate?.length && !filesToCreate?.length) {
    console.log(
      "\n\n\n\n^^^^^^\n\n\n\nERROR: No files to update or create\n\n\n\n",
    );
    throw new Error("No files to update or create");
  }
  const { code } = concatenateFiles(
    rootPath,
    undefined,
    filesToUpdate,
    filesToCreate,
  );
  // console.log(`[${repository.full_name}] Concatenated code:\n\n`, code);

  const types = getTypes(rootPath, repoSettings);
  const packages = Object.keys(repoSettings?.packageDependencies ?? {}).join(
    "\n",
  );
  const styles = await getStyles(rootPath, repoSettings);
  let images = await getImages(rootPath, repoSettings);
  images = await saveImages(images, issue?.body, rootPath, repoSettings);

  // TODO: populate tailwind colors and leverage in system prompt

  const codeTemplateParams = {
    sourceMap,
    types,
    packages,
    styles,
    images,
    code,
    issueBody: issueText,
    plan: extractedIssue.stepsToAddressIssue ?? "",
    snapshotUrl: snapshotUrl ?? "",
  };

  const codeSystemPrompt = constructNewOrEditSystemPrompt(
    "code_edit_files",
    codeTemplateParams,
    repoSettings,
  );
  const codeUserPrompt = parseTemplate(
    "dev",
    "code_edit_files",
    "user",
    codeTemplateParams,
  );

  // Start with Claude, but if there is a lot of code, we need to use a model with a large output token limit
  let model: Model = "claude-3-5-sonnet-20240620";
  const codeTokenCount = countTokens(code) * 1.25; // Leave room for new code additions
  if (codeTokenCount > MAX_OUTPUT[model]) {
    model = "gpt-4o-64k-output-alpha";
  }

  // Call sendGptRequest with the issue and concatenated code file
  const updatedCode = (await sendGptRequest(
    codeUserPrompt,
    codeSystemPrompt,
    0.2,
    baseEventData,
    3,
    60000,
    undefined,
    model,
  ))!;

  if (updatedCode.length < 10 || !updatedCode.includes("__FILEPATH__")) {
    console.log(`[${repository.full_name}] code`, code);
    console.log(`[${repository.full_name}] No code generated. Exiting...`);
    throw new Error("No code generated");
  }
  const newBranch = generateJacobBranchName(issue.number);

  await setNewBranch({
    ...baseEventData,
    rootPath,
    branchName: newBranch,
  });

  const files = reconstructFiles(updatedCode, rootPath);
  await Promise.all(
    files.map((file) => emitCodeEvent({ ...baseEventData, ...file })),
  );

  await checkAndCommit({
    ...baseEventData,
    repository,
    token,
    rootPath,
    branch: newBranch,
    repoSettings,
    commitMessage: `JACoB PR for Issue ${issue.title}`,
    issue,
    newPrTitle: `JACoB PR for Issue ${issue.title}`,
    newPrBody: `## Summary:\n\n${issue.body}\n\n## Plan:\n\n${
      extractedIssue.stepsToAddressIssue ?? ""
    }`,
    newPrReviewers: issue.assignees?.map((assignee) => assignee.login) ?? [],
  });
}
