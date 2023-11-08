import { Issue, Repository } from "@octokit/webhooks-types";
import { z } from "zod";

import { getSourceMap, getTypes, getImages } from "../analyze/sourceMap";
import { traverseCodebase } from "../analyze/traverse";
import { parseTemplate } from "../utils";
import { concatenateFiles, reconstructFiles } from "../utils/files";
import { sendGptRequest, sendGptRequestWithSchema } from "../openai/request";
import { setNewBranch } from "../git/branch";
import { addCommitAndPush } from "../git/commit";
import { runBuildCheck } from "../build/node/check";
import { createPR } from "../github/pr";
import { addCommentToIssue } from "../github/issue";

export enum IssueType {
  BUG = "BUG",
  FEATURE = "FEATURE",
  DOCUMENTATION = "DOCUMENTATION",
  OTHER = "OTHER",
}
export enum FileChangeType {
  CREATE_FILE = "CREATE_FILE",
  UPDATE_FILE = "UPDATE_FILE",
  DELETE_FILE = "DELETE_FILE",
  UNKNOWN = "UNKNOWN",
}
export enum DocumentationType {
  FUNCTIONAL_SPEC = "FUNCTIONAL_SPEC",
  TECHNICAL_SPEC = "TECHNICAL_SPEC",
  OTHER = "OTHER",
}
export const ExtractedIssueInfoSchema = z.object({
  issueType: z.nativeEnum(IssueType),
  fileChangeType: z.nativeEnum(FileChangeType).nullable().optional(), // If IssueType == "BUG" or "FEATURE", the type of file change that needs to be made
  documentationType: z.nativeEnum(DocumentationType).nullable().optional(), // If IssueType == "DOCUMENTATION", the type of documentation that needs to be created
  issueSummary: z.string().nullable().optional(), // a high-level summary of the issue
  stepsToAddressIssue: z.string().nullable().optional(), // a step-by-step plan of how a developer would address the given issue
  exampleFiles: z.array(z.string()).nullable().optional(), // Only if an example file is listed in the issue, an array of existing files that are similar to the files that will be edited or created. This can be used to help GPT write code using similar patterns, styles, and give hints to the underlying file structure.
  filesToCreate: z.array(z.string()).nullable().optional(), // If fileChangeType == "CREATE_FILE", an array of file paths that will be created by the developer.
  filesToUpdate: z.array(z.string()).nullable().optional(), // If fileChangeType == UPDATE_FILE, an array of file paths that will be updated by the developer.
  filesToDelete: z.array(z.string()).nullable().optional(), // If fileChangeType == DELETE_FILE, an array of file paths that will be deleted by the developer.
});

export type ExtractedIssueInfo = z.infer<typeof ExtractedIssueInfoSchema>;

export async function editFiles(
  repository: Repository,
  token: string,
  issue: Issue,
  rootPath: string,
) {
  const projectFiles = await traverseCodebase(rootPath);
  // When we start processing PRs, need to handle appending additionalComments
  const issueText = `${issue.title} ${issue.body}`;

  const extractedIssueTemplateParams = {
    projectFiles,
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
  )) as ExtractedIssueInfo;

  // TODO: handle previousAssessments
  const filesToUpdate = extractedIssue.filesToUpdate || [];

  console.log("Files to update:", filesToUpdate);
  if (!filesToUpdate?.length) {
    console.log("\n\n\n\n^^^^^^\n\n\n\nERROR: No files to update\n\n\n\n");
    throw new Error("No files to update");
  }
  const code = concatenateFiles(rootPath, filesToUpdate);
  console.log("Concatenated code:\n\n", code);

  const sourceMap = getSourceMap(rootPath);
  const types = getTypes(rootPath);
  const images = getImages(rootPath);
  // TODO: populate tailwind colors and leverage in system prompt

  const codeTemplateParams = {
    sourceMap,
    types,
    images,
    code,
    issueText,
    stepsToAddressIssue: extractedIssue.stepsToAddressIssue ?? "",
  };

  const codeSystemPrompt = parseTemplate(
    "dev",
    "code_edit_files",
    "system",
    codeTemplateParams,
  );
  const codeUserPrompt = parseTemplate(
    "dev",
    "code_edit_files",
    "user",
    codeTemplateParams,
  );

  // Call sendGptRequest with the issue and concatenated code file
  const updatedCode = (await sendGptRequest(
    codeUserPrompt,
    codeSystemPrompt,
    0.2,
  )) as string;

  if (updatedCode.length < 10 || !updatedCode.includes("__FILEPATH__")) {
    console.log("code", code);
    console.log("No code generated. Exiting...");
    throw new Error("No code generated");
  }

  // if the first line of the diff starts with ``` then it is a code block. Remove the first line.
  // TODO: move this to the prompt and accept an answer that can be parsed with Zod. If it fails validation, try again with the validation error message.
  const realCode = updatedCode.startsWith("```")
    ? updatedCode.split("```").slice(1).join("")
    : updatedCode;

  const newBranch = `otto-issue-${issue.number}-${Date.now()}`;

  await setNewBranch(rootPath, newBranch);

  reconstructFiles(realCode, rootPath);

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
    `Otto PR for Issue ${issue.title}`,
    `## Summary:\n\n${issue.body}\n\n## Plan:\n\n${
      extractedIssue.stepsToAddressIssue ?? ""
    }`,
    issue.assignees.map((assignee) => assignee.login),
  );

  console.log(`Created PR #${pullRequest.number}: ${pullRequest.html_url}`);

  const prMessage = `Hello human! 👋 \n\nThis PR was created by Otto to address the issue [${issue.title}](${issue.html_url})\n\n## Next Steps\n\n1. Please review the PR carefully. Auto-generated code can and will contain subtle bugs and mistakes.\n\n2. If you identify code that needs to be changed, please reject the PR with a specific reason. Be as detailed as possible in your comments. Otto will take these comments, make changes to the code and push up changes. Please note that this process will take a few minutes.\n\n3. Once the code looks good, approve the PR and merge the code.`;
  await addCommentToIssue(repository, pullRequest.number, token, prMessage);

  const issueMessage = `Good news!\n\nI've completed my work on this issue and have created a pull request: [${pullRequest.title}](${pullRequest.html_url}).\n\nPlease review my changes there.\n`;
  await addCommentToIssue(repository, issue.number, token, issueMessage);
}
