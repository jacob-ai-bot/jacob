import { type Issue, type Repository } from "@octokit/webhooks-types";
import fs from "fs";
import { getTypes, getImages } from "../analyze/sourceMap";
import {
  parseTemplate,
  constructNewOrEditSystemPrompt,
  type RepoSettings,
  type BaseEventData,
  getStyles,
  generateJacobBranchName,
} from "../utils";
import { addLineNumbers, getFiles, removeLineNumbers } from "../utils/files";
import { sendGptVisionRequest } from "../openai/request";
import { setNewBranch } from "../git/branch";
import { checkAndCommit } from "./checkAndCommit";
import { saveImages } from "../utils/images";
import { emitCodeEvent, emitPlanStepEvent } from "../utils/events";
import { getSnapshotUrl } from "~/app/utils";
import { createPlan, type Plan } from "~/server/utils/agent";
import { sendSelfConsistencyChainOfThoughtGptRequest } from "../openai/utils";
import { addCommitAndPush } from "../git/commit";
import path from "path";

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
  // When we start processing PRs, need to handle appending additionalComments
  const issueBody = issue.body ? `\n${issue.body}` : "";
  const issueText = `${issue.title}${issueBody}`;
  //   const research = await researchIssue(
  //     issueText,
  //     sourceMapOrFileList,
  //     rootPath,
  //   );
  const research = ""; // TODO: currently this is part of the GitHub issue, need to separate it out
  let codePatch = "";
  const maxPlanIterations = 3;
  let planIterations = 0;
  let originalPlan: Plan | undefined;
  let newPrBody = "";
  while (planIterations < maxPlanIterations) {
    planIterations++;
    const plan = await createPlan(
      issueText,
      sourceMap,
      research,
      originalPlan,
      codePatch,
    );
    if (!plan) {
      throw new Error("No plan generated");
    }
    if (originalPlan === undefined) {
      originalPlan = plan;
    }
    if (!plan.steps?.length) {
      // No steps in the plan, so we're done
      break;
    }
    let stepNumber = 0;
    for (const step of plan.steps) {
      stepNumber++;
      await emitPlanStepEvent({ ...baseEventData, planStep: step });
      // const step = plan.steps[0];
      // if (!step) {
      //   throw new Error("No step generated");
      // }
      console.log(
        `Step ${stepNumber}: ${step.title}\n\nFiles: ${step.filePaths?.join(",")}\n\nDetails: ${step.instructions}\n\nExit Criteria${step.exitCriteria}`,
      );
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
      const packages = Object.keys(
        repoSettings?.packageDependencies ?? {},
      ).join("\n");
      const styles = await getStyles(rootPath, repoSettings);
      let images = await getImages(rootPath, repoSettings);
      images = await saveImages(images, issue?.body, rootPath, repoSettings);

      // TODO: populate tailwind colors and leverage in system prompt
      const filePlan = `Instructions for ${step.filePaths?.join(", ")}:\n\n${step.instructions}\n\nExit Criteria:\n\n${step.exitCriteria}`;

      const codeTemplateParams = {
        sourceMap,
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
      const patchMatch = response?.match(
        /<code_patch>([\s\S]*?)<\/code_patch>/,
      );
      const patch = patchMatch?.[1] ? patchMatch[1].trim() : "";

      if (patch) {
        // commit the file and push to the branch
        await setNewBranch({
          ...baseEventData,
          rootPath,
          branchName: newBranch,
        });

        const files = await applyCodePatch(rootPath, step.filePaths, patch);
        await Promise.all(
          files.map((file) => emitCodeEvent({ ...baseEventData, ...file })),
        );

        await addCommitAndPush({
          ...baseEventData,
          rootPath,
          branchName: newBranch,
          commitMessage: step.title,
          token,
        });
        // Save this patch and add it to the list of other code patches
        codePatch += `\n${patch}\n`;
      } else {
        console.log("No changes were made in this step.");
      }

      console.log(`\n\n\n\n***** <code_patch>`, codePatch);
      console.log(`</code_patch> *****\n\n\n\n`);
      console.log(`[${repository.full_name}] planIterations`, planIterations);
    }
    newPrBody += `## Changes Performed:\n\n${
      plan.steps
        ?.map(
          (step, idx) =>
            `### Step ${idx + 1}: ${step.title}\n\n## Files: ${step.filePaths?.join(",")}\n\n## Details: ${step.instructions}\n\n## Exit Criteria${step.exitCriteria}`,
        )
        .join("\n\n") ?? `No plan found.`
    }`;
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
    newPrBody,
    newPrReviewers: issue.assignees.map((assignee) => assignee.login),
  });

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

interface FileContent {
  fileName: string;
  filePath: string;
  codeBlock: string;
}

async function applyCodePatch(
  rootPath: string,
  filePaths: string[],
  patch: string,
): Promise<FileContent[]> {
  const files: FileContent[] = [];
  for (const filePath of filePaths) {
    try {
      // First, check to see if the file exists
      const fullFilePath = path.join(rootPath, filePath);
      if (!fs.existsSync(fullFilePath)) {
        console.error(`File ${filePath} does not exist`);
        continue;
      }
      // Read the existing file content
      const existingContent = fs.readFileSync(filePath, "utf-8");
      const numberedContent = addLineNumbers(existingContent);

      // Prepare the prompt for the LLM
      const userPrompt = `
I have an existing file with the following content (line numbers added for reference):

${numberedContent}

I want to apply the following patch to this file:

${patch}

Please provide the updated file content after applying the patch. Your response should:
1. Include the entire file content, not just the changed parts.
2. Maintain the original line numbers.
3. Be surrounded by <file_content> tags.
4. Contain no additional commentary, explanations, or code blocks.

Here's an example of how your response should be formatted:

<file_content>
1| import React from 'react';
2| 
3| function App() {
4|   return (
5|     <div>
6|       <h1>Hello, World!</h1>
7|     </div>
8|   );
9| }
10| 
11| export default App;
</file_content>`;

      const systemPrompt = `You are an expert code editor. Your task is to apply the given patch to the existing file content and return the entire updated file content, including line numbers. Make sure to handle line numbers correctly, even if they are inconsistent in the patch. If a hunk in the patch cannot be applied, skip it and continue with the next one. Your response must be the complete file content surrounded by <file_content> tags, with no additional commentary or code blocks.`;

      // Call the LLM to apply the patch
      const rawUpdatedContent =
        await sendSelfConsistencyChainOfThoughtGptRequest(
          userPrompt,
          systemPrompt,
        );

      if (rawUpdatedContent) {
        // Extract content between <file_content> tags
        const contentMatch = rawUpdatedContent.match(
          /<file_content>([\s\S]*)<\/file_content>/,
        );
        if (contentMatch?.[1]) {
          const numberedUpdatedContent = contentMatch[1].trim();
          const updatedContent = removeLineNumbers(numberedUpdatedContent);

          fs.writeFileSync(fullFilePath, updatedContent, "utf-8");
          console.log(`Successfully updated ${filePath}`);
          files.push({
            fileName: filePath.split("/").pop() ?? "",
            filePath,
            codeBlock: updatedContent,
          });
        } else {
          throw new Error(
            "LLM response did not contain properly formatted file content",
          );
        }
      } else {
        throw new Error(`Failed to apply patch to ${filePath}`);
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
    }
  }
  return files;
}
