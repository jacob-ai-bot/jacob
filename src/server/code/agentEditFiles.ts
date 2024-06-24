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
import {
  addLineNumbers,
  concatenateFiles,
  getFiles,
  reconstructFiles,
} from "../utils/files";
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
  type PlanStep,
  type Plan,
} from "~/server/utils/agent";

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
  let codePatch = "";
  const maxPlanIterations = 20;
  let planIterations = 0;
  let originalPlan: Plan | undefined;
  let previousStep: PlanStep | undefined;
  let stepsRemaining: PlanStep[] | undefined;
  while (planIterations < maxPlanIterations) {
    planIterations++;
    const plan = await createPlan(
      issueText,
      sourceMapOrFileList,
      research,
      originalPlan,
      stepsRemaining,
      previousStep,
      codePatch,
    );
    if (!plan) {
      throw new Error("No plan generated");
    }
    if (!plan.steps?.length) {
      // No steps in the plan, so we're done
      break;
    }
    const step = plan.steps[0];
    if (!step) {
      throw new Error("No step generated");
    }

    if (originalPlan === undefined) {
      originalPlan = plan;
      console.log("Original Plan", JSON.stringify(originalPlan));
    }
    console.log(JSON.stringify(step));
    // const filesToUpdate =
    //   step.type === PlanningAgentActionType.EditExistingCode
    //     ? step.filePaths
    //     : [];
    // const filesToCreate =
    //   step.type === PlanningAgentActionType.CreateNewCode ? step.filePaths : [];
    // const { code } = concatenateFiles(
    //   rootPath,
    //   undefined,
    //   filesToUpdate,
    //   filesToCreate,
    // );
    const code = getFiles(rootPath, step.filePaths);
    const types = getTypes(rootPath, repoSettings);
    const packages = Object.keys(repoSettings?.packageDependencies ?? {}).join(
      "\n",
    );
    const styles = await getStyles(rootPath, repoSettings);
    let images = await getImages(rootPath, repoSettings);
    images = await saveImages(images, issue?.body, rootPath, repoSettings);

    // TODO: populate tailwind colors and leverage in system prompt
    const filePlan = `Instructions for ${step.filePaths?.join(", ")}:\n\n${step.instructions}\n\nExit Criteria:\n\n${step.exitCriteria}`;

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
      codePatch,
    };

    const codeSystemPrompt = constructNewOrEditSystemPrompt(
      "code_edit_files_diff",
      codeTemplateParams,
      repoSettings,
    );
    const codeUserPrompt = parseTemplate(
      "dev",
      "code_edit_files_diff",
      "user",
      codeTemplateParams,
    );

    // Call sendGptRequest with the issue and concatenated code file
    const response = await sendGptVisionRequest(
      codeUserPrompt,
      codeSystemPrompt,
      snapshotUrl,
      0.2,
      baseEventData,
    );

    // Extract the patch from the response
    const patchMatch = response?.match(/<code_patch>([\s\S]*?)<\/code_patch>/);
    const patch = patchMatch?.[1] ? patchMatch[1].trim() : "";

    if (patch) {
      codePatch += patch;
    } else {
      console.log("No changes were made in this step.");
    }

    stepsRemaining = plan.steps.filter((s) => s !== step);
    previousStep = step;

    console.log(`\n\n\n\n***** <code_patch>`, codePatch);
    console.log(`</code_patch> *****\n\n\n\n`);
    console.log(`[${repository.full_name}] planIterations`, planIterations);
    console.log(
      `[${repository.full_name}] plan.steps`,
      JSON.stringify(stepsRemaining),
    );
  }
  // Need to do a final pass through the code patch to ensure consistency. Things like ensuring the props are correct, the stylings are correctly added, etc.

  //     if (updatedCode.length < 10 || !updatedCode.includes("__FILEPATH__")) {
  //       console.log(`[${repository.full_name}] code`, code);
  //       console.log(`[${repository.full_name}] No code generated. Exiting...`);
  //       throw new Error("No code generated");
  //     }

  //     await setNewBranch({
  //       ...baseEventData,
  //       rootPath,
  //       branchName: newBranch,
  //     });

  //     const files = reconstructFiles(updatedCode, rootPath);
  //     await Promise.all(
  //       files.map((file) => emitCodeEvent({ ...baseEventData, ...file })),
  //     );

  //   await checkAndCommit({
  //     ...baseEventData,
  //     repository,
  //     token,
  //     rootPath,
  //     branch: newBranch,
  //     repoSettings,
  //     commitMessage: `JACoB PR for Issue ${issue.title}`,
  //     issue,
  //     newPrTitle: `JACoB PR for Issue ${issue.title}`,
  //     newPrBody: `## Summary:\n\n${issue.body}\n\n## Plan:\n\n${
  //       plan.steps
  //         ?.map(
  //           (step) =>
  //             `### ${step.filePath}\n\n${step.instructions}\n\n${step.exitCriteria}`,
  //         )
  //         .join("\n\n") ?? `No plan found.`
  //     }`,
  //     newPrReviewers: issue.assignees.map((assignee) => assignee.login),
  //   });
}
