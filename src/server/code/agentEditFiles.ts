import { type Issue, type Repository } from "@octokit/webhooks-types";
import { getTypes, getImages } from "../analyze/sourceMap";
import { db } from "~/server/db/db";
import {
  parseTemplate,
  type RepoSettings,
  type BaseEventData,
  getStyles,
  generateJacobBranchName,
} from "../utils";
import { getFiles, standardizePath } from "../utils/files";
import { sendGptVisionRequest } from "../openai/request";
import { setNewBranch } from "../git/branch";
import { checkAndCommit } from "./checkAndCommit";
import { saveImages } from "../utils/images";
import { applyCodePatch, type FileContent } from "~/server/utils/files";
import { gitStash } from "~/server/git/operations";

import {
  emitCodeEvent,
  emitPlanEvent,
  emitPlanStepEvent,
} from "../utils/events";
import { getSnapshotUrl } from "~/app/utils";
import { createPlan } from "~/server/agent/plan";
import { applyCodePatchViaLLM } from "~/server/agent/patch";
import { PlanningAgentActionType } from "~/server/db/enums";

import { addCommitAndPush } from "../git/commit";
import { runBuildCheck } from "../build/node/check";
import { getOrCreateCodebaseContext } from "../utils/codebaseContext";
import { traverseCodebase } from "../analyze/traverse";
import { selectRelevantFiles } from "../agent/research";

export interface EditFilesParams extends BaseEventData {
  repository: Repository;
  token: string;
  issue: Issue;
  rootPath: string;
  sourceMap: string;
  repoSettings?: RepoSettings;
  dryRun?: boolean;
}

export async function editFiles(params: EditFilesParams) {
  const {
    repository,
    token,
    issue,
    rootPath,
    sourceMap,
    repoSettings,
    dryRun,
    ...baseEventData
  } = params;
  const newBranch = await generateJacobBranchName(
    issue.number,
    issue.title,
    issue.body ?? "",
  );
  const snapshotUrl = getSnapshotUrl(issue.body);
  // Fallback to a source file list if we don't have a source map (e.g. JS projects)
  // When we start processing PRs, need to handle appending additionalComments
  const issueBody = issue.body ? `\n${issue.body}` : "";
  const issueText = `${issue.title}${issueBody}`;
  const projectId = baseEventData.projectId;

  const todo = await db.todos.findByOptional({
    projectId,
    issueId: issue.number,
  });
  if (!todo) {
    // TODO: create a new todo
    throw new Error("No todo found");
  }

  // Fetch research data from the database based on the issue ID
  const researchData = await db.research.where({ todoId: todo.id }).all();

  // Convert the fetched research data into a string of question/answers
  const research = researchData
    .map((item) => `Question: ${item.question}\nAnswer: ${item.answer}`)
    .join("\n\n");

  // get the plan context
  const allFiles = traverseCodebase(rootPath);
  const query = `Based on the GitHub issue and the research, your job is to find the most important files in this codebase.\n
  Here is the issue <issue>${issueText}</issue> \n
  Here is the research <research>${research}</research> \n
  Based on the GitHub issue and the research, what are the 25 most relevant files to resolving this GitHub issue in this codebase?`;
  const relevantPlanFiles = await selectRelevantFiles(
    query,
    undefined,
    allFiles,
    25,
  );
  console.log("**** relevantPlanFiles ****", relevantPlanFiles);
  const planContext = await getOrCreateCodebaseContext(
    projectId,
    rootPath,
    relevantPlanFiles?.map((file) => standardizePath(file)) ?? [],
  );

  if (!planContext || planContext.length === 0) {
    throw new Error("No plan context generated");
  }
  let codePatch = "";
  const maxPlanIterations = 1; // TODO: experiment with other values
  const maxSteps = 10;
  let isPlanComplete = false;
  let planIterations = 0;
  let buildErrors = "";
  let newPrBody = "";
  while (planIterations < maxPlanIterations && !isPlanComplete) {
    planIterations++;
    const plan = await createPlan(
      issueText,
      planContext?.map((c) => `${c.file}:\n${c.text}`).join("\n") ?? "",
      research,
      codePatch,
      buildErrors,
    );
    codePatch = "";
    buildErrors = "";
    if (!plan) {
      throw new Error("No plan generated");
    }
    await emitPlanEvent({ ...baseEventData, plan });
    if (!plan.steps?.length) {
      // No steps in the plan, so we're done
      break;
    }
    let stepNumber = 0;
    // Get all the existing filePaths from the plan
    const filePaths = plan.steps
      .filter((step) => step.type === PlanningAgentActionType.EditExistingCode)
      .map((step) => step.filePath);

    // Get the codebase context for each file in the plan
    const contexts = await getOrCreateCodebaseContext(
      projectId,
      rootPath,
      filePaths,
    );
    for (const step of plan.steps.slice(0, maxSteps)) {
      stepNumber++;
      const contextItem = contexts.find(
        (c) => standardizePath(c.file) === step.filePath,
      );
      const isNewFile = step.type === PlanningAgentActionType.CreateNewCode;
      await emitPlanStepEvent({ ...baseEventData, planStep: step });
      // const step = plan.steps[0];
      // if (!step) {
      //   throw new Error("No step generated");
      // }
      console.log(
        `Step ${stepNumber}: ${step.title}\n\nFile: ${step.filePath}\n\nDetails: ${step.instructions}\n\nExit Criteria${step.exitCriteria}`,
      );

      const code = isNewFile ? "" : getFiles(rootPath, [step.filePath]);

      const types = getTypes(rootPath, repoSettings);
      const packages = Object.keys(
        repoSettings?.packageDependencies ?? {},
      ).join("\n");
      const styles = await getStyles(rootPath, repoSettings);
      let images = await getImages(rootPath, repoSettings);
      images = await saveImages(images, issue?.body, rootPath, repoSettings);

      const filePlan = `Instructions for ${step.filePath}:\n\n${step.instructions}\n\nExit Criteria:\n\n${step.exitCriteria}`;

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
        context: JSON.stringify(contextItem, null, 2) ?? "",
      };

      const codeSystemPrompt = parseTemplate(
        "dev",
        "code_edit_files_diff",
        "system",
        codeTemplateParams,
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

      if (patch && !dryRun) {
        // commit the file and push to the branch
        await setNewBranch({
          ...baseEventData,
          rootPath,
          branchName: newBranch,
        });

        let patchResult: FileContent[] | undefined;
        try {
          patchResult = await applyCodePatch(rootPath, patch);
        } catch (e) {
          // Stash in case we have a partially applied local patch that failed
          await gitStash({ directory: rootPath, baseEventData });
          console.log(
            `Will attempt applyCodePatchViaLLM() since local applyCodePatch failed with ${String(e)}`,
          );
        }

        const files =
          patchResult ??
          (await applyCodePatchViaLLM(
            rootPath,
            step.filePath,
            patch,
            isNewFile,
          ));
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
            `### Step ${idx + 1}: ${step.title}\n\n#### Files: \n\n${step.filePath}\n\n#### Details: \n\n${step.instructions}\n\n#### Exit Criteria\n\n${step.exitCriteria}\n\n\n`,
        )
        .join("\n\n") ?? `No plan found.`
    }`;
    // After all the code patches have been applied, run the build check
    // Save the build errors and pass them back to the next iteration
    try {
      if (!dryRun) {
        await runBuildCheck({
          ...baseEventData,
          path: rootPath,
          afterModifications: true,
          repoSettings,
        });
      }
      isPlanComplete = true;
    } catch (error) {
      const { message } = error as Error;
      buildErrors = message;
    }
  }

  if (dryRun) {
    console.log(`\n\n\n\n***** Dry Run (no PR created)`, newPrBody);
    return;
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
}
