import { type Issue, type Repository } from "@octokit/webhooks-types";

import { getTypes, getImages } from "../analyze/sourceMap";
import { traverseCodebase } from "../analyze/traverse";
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
  sendGptRequestWithSchema,
  sendGptVisionRequest,
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
import OpenAI from "openai";
import dedent from "ts-dedent";
import {
  PlanningAgentActionType,
  createPlan,
  researchIssue,
} from "../utils/agent";

export interface EditFilesParams extends BaseEventData {
  repository: Repository;
  token: string;
  issue: Issue;
  rootPath: string;
  sourceMap: string;
  repoSettings?: RepoSettings;
}

export async function agentEditFiles(params: EditFilesParams) {
  const {
    repository,
    token,
    issue,
    rootPath,
    sourceMap,
    repoSettings,
    ...baseEventData
  } = params;
  const newBranch = generateJacobBranchName(issue.number);
  const snapshotUrl = getSnapshotUrl(issue.body);
  // Fallback to a source file list if we don't have a source map (e.g. JS projects)
  const sourceMapOrFileList = sourceMap || (await traverseCodebase(rootPath));
  // When we start processing PRs, need to handle appending additionalComments
  const issueBody = issue.body ? `\n${issue.body}` : "";
  const issueText = `${issue.title}${issueBody}`;
  //   const research = await researchIssue(
  //     issueText,
  //     sourceMapOrFileList,
  //     rootPath,
  //   );
  const research = issue.body ?? "";
  const plan = await createPlan(issueText, sourceMapOrFileList, research);
  for (const step of plan.steps) {
    console.log(step);
    const filesToUpdate =
      step.type === PlanningAgentActionType.EditExistingCode
        ? [step.filePath]
        : [];
    const filesToCreate =
      step.type === PlanningAgentActionType.CreateNewCode
        ? [step.filePath]
        : [];
    const { code } = concatenateFiles(
      rootPath,
      undefined,
      filesToUpdate,
      filesToCreate,
    );
    const types = getTypes(rootPath, repoSettings);
    const packages = Object.keys(repoSettings?.packageDependencies ?? {}).join(
      "\n",
    );
    const styles = await getStyles(rootPath, repoSettings);
    let images = await getImages(rootPath, repoSettings);
    images = await saveImages(images, issue?.body, rootPath, repoSettings);

    // TODO: populate tailwind colors and leverage in system prompt
    const filePlan = `Instructions for ${step.filePath}: ${step.instructions ?? ""}\n\nExit Criteria for ${step.filePath}: ${step.exitCriteria ?? ""}`;

    const codeTemplateParams = {
      sourceMap: sourceMapOrFileList,
      types,
      packages,
      styles,
      images,
      code,
      issueBody: issueText,
      research,
      plan: filePlan,
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

    // Call sendGptRequest with the issue and concatenated code file
    const updatedCode = (await sendGptVisionRequest(
      codeUserPrompt,
      codeSystemPrompt,
      snapshotUrl,
      0.2,
      baseEventData,
    ))!;

    if (updatedCode.length < 10 || !updatedCode.includes("__FILEPATH__")) {
      console.log(`[${repository.full_name}] code`, code);
      console.log(`[${repository.full_name}] No code generated. Exiting...`);
      throw new Error("No code generated");
    }

    await setNewBranch({
      ...baseEventData,
      rootPath,
      branchName: newBranch,
    });

    const files = reconstructFiles(updatedCode, rootPath);
    await Promise.all(
      files.map((file) => emitCodeEvent({ ...baseEventData, ...file })),
    );
  }

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
      plan.steps
        ?.map(
          (step) =>
            `### ${step.filePath}\n\n${step.instructions}\n\n${step.exitCriteria}`,
        )
        .join("\n\n") ?? `No plan found.`
    }`,
    newPrReviewers: issue.assignees.map((assignee) => assignee.login),
  });
}
