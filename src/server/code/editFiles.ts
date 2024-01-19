import { Issue, Repository } from "@octokit/webhooks-types";
import { z } from "zod";

import { getSourceMap, getTypes, getImages } from "../analyze/sourceMap";
import { traverseCodebase } from "../analyze/traverse";
import {
  parseTemplate,
  constructNewOrEditSystemPrompt,
  RepoSettings,
} from "../utils";
import { concatenateFiles, reconstructFiles } from "../utils/files";
import { sendGptRequest, sendGptRequestWithSchema } from "../openai/request";
import { setNewBranch } from "../git/branch";
import { checkAndCommit } from "./checkAndCommit";

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
  repoSettings?: RepoSettings
) {
  const projectFiles = await traverseCodebase(rootPath);
  // When we start processing PRs, need to handle appending additionalComments
  const issueBody = issue.body ?? "";
  const issueText = `${issue.title} ${issueBody}`;

  const extractedIssueTemplateParams = {
    projectFiles,
    issueText,
  };

  const extractedIssueSystemPrompt = parseTemplate(
    "dev",
    "extracted_issue",
    "system",
    extractedIssueTemplateParams
  );
  const extractedIssueUserPrompt = parseTemplate(
    "dev",
    "extracted_issue",
    "user",
    extractedIssueTemplateParams
  );
  const extractedIssue = (await sendGptRequestWithSchema(
    extractedIssueUserPrompt,
    extractedIssueSystemPrompt,
    ExtractedIssueInfoSchema,
    0.2
  )) as ExtractedIssueInfo;

  // TODO: handle previousAssessments
  const filesToUpdate = extractedIssue.filesToUpdate || [];

  console.log(`[${repository.full_name}] Files to update:`, filesToUpdate);
  if (!filesToUpdate?.length) {
    console.log("\n\n\n\n^^^^^^\n\n\n\nERROR: No files to update\n\n\n\n");
    throw new Error("No files to update");
  }
  const code = concatenateFiles(rootPath, filesToUpdate);
  console.log(`[${repository.full_name}] Concatenated code:\n\n`, code);

  const sourceMap = getSourceMap(rootPath, repoSettings);
  const types = getTypes(rootPath, repoSettings);
  const images = getImages(rootPath);
  // TODO: populate tailwind colors and leverage in system prompt

  const codeTemplateParams = {
    sourceMap,
    types,
    images,
    code,
    issueBody,
    plan: extractedIssue.stepsToAddressIssue ?? "",
  };

  const codeSystemPrompt = constructNewOrEditSystemPrompt(
    "code_edit_files",
    codeTemplateParams,
    repoSettings
  );
  const codeUserPrompt = parseTemplate(
    "dev",
    "code_edit_files",
    "user",
    codeTemplateParams
  );

  // Call sendGptRequest with the issue and concatenated code file
  const updatedCode = (await sendGptRequest(
    codeUserPrompt,
    codeSystemPrompt,
    0.2
  )) as string;

  if (updatedCode.length < 10 || !updatedCode.includes("__FILEPATH__")) {
    console.log(`[${repository.full_name}] code`, code);
    console.log(`[${repository.full_name}] No code generated. Exiting...`);
    throw new Error("No code generated");
  }
  const newBranch = `jacob-issue-${issue.number}-${Date.now()}`;

  await setNewBranch(rootPath, newBranch);

  reconstructFiles(updatedCode, rootPath);

  await checkAndCommit({
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
    newPrReviewers: issue.assignees.map((assignee) => assignee.login),
  });
}
