import { dedent } from "ts-dedent";
import { type Issue, type Repository } from "@octokit/webhooks-types";
import {
  parseTemplate,
  constructNewOrEditSystemPrompt,
  type RepoSettings,
  type BaseEventData,
  generateJacobBranchName,
  getStyles,
  type TemplateParams,
} from "../utils";
import {
  countTokens,
  MAX_OUTPUT,
  type Model,
  sendGptRequest,
} from "../openai/request";
import { setNewBranch } from "../git/branch";
import { checkAndCommit } from "./checkAndCommit";
import { concatenateFiles, reconstructFiles } from "../utils/files";
import { emitCodeEvent } from "../utils/events";
import { getSnapshotUrl } from "~/app/utils";
import { db } from "../db/db";
import { researchIssue } from "../agent/research";
import { getOrCreateTodo } from "../utils/todos";
import { getTypes, getImages } from "../analyze/sourceMap";
import { saveImages } from "../utils/images";
import { getOrGeneratePlan } from "../utils/plan";
import { PlanningAgentActionType } from "../db/enums";
import { type PlanStep } from "../agent/plan";
import fs from "fs";
import path from "path";

export interface EditFilesParams extends BaseEventData {
  repository: Repository;
  token: string;
  issue: Issue;
  rootPath: string;
  sourceMap: string;
  baseBranch?: string;
  dryRun?: boolean;
  repoSettings?: RepoSettings;
}

async function processStepIndividually(
  step: PlanStep,
  params: {
    rootPath: string;
    repoSettings?: RepoSettings;
    baseEventData: BaseEventData;
    issueText: string;
    researchData: (typeof db.research.prototype)[];
    model: Model;
  },
) {
  const {
    rootPath,
    repoSettings,
    baseEventData,
    issueText,
    researchData,
    model,
  } = params;

  const filesToProcess = [step.filePath];
  const { code } = concatenateFiles(
    rootPath,
    undefined,
    step.type === PlanningAgentActionType.EditExistingCode
      ? filesToProcess
      : [],
    step.type === PlanningAgentActionType.CreateNewCode ? filesToProcess : [],
  );

  const types = getTypes(rootPath, repoSettings);
  const packages = Object.keys(repoSettings?.packageDependencies ?? {}).join(
    "\n",
  );
  const styles = await getStyles(rootPath, repoSettings);
  const images = await saveImages(
    await getImages(rootPath, repoSettings),
    issueText,
    rootPath,
    repoSettings,
  );

  const detailedMarkdownPlanFromSteps = dedent`
    ### Step: ${step.type === PlanningAgentActionType.EditExistingCode ? "Edit" : "Create"} \`${step.filePath}\`

    **Task:** ${step.title}

    **Instructions:**
    ${step.instructions}

    **Exit Criteria:**
    ${step.exitCriteria}

    ${step.dependencies ? `**Dependencies:**\n${step.dependencies}` : ""}
  `;

  const detailedMarkdownResearchData = researchData
    .filter((research) => research.answer?.length)
    .map(
      (research) => dedent`
        ## Question:
        ${research.question}

        ## Answer:
        ${research.answer}
      `,
    )
    .join("\n");

  const codeTemplateParams: TemplateParams = {
    sourceMap: "",
    types,
    packages,
    styles,
    images,
    code,
    issueBody: issueText,
    plan: detailedMarkdownPlanFromSteps,
    research: detailedMarkdownResearchData,
    snapshotUrl: "",
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

  return await sendGptRequest(
    codeUserPrompt,
    codeSystemPrompt,
    0.2,
    baseEventData,
    3,
    60000,
    undefined,
    model,
  );
}

export async function editFiles(params: EditFilesParams) {
  const {
    repository,
    token,
    issue,
    rootPath,
    sourceMap,
    baseBranch,
    dryRun,
    repoSettings,
    ...baseEventData
  } = params;

  const snapshotUrl = getSnapshotUrl(issue.body);
  const issueBody = issue.body ? `\n${issue.body}` : "";
  const issueText = issue.title + issueBody;

  const projectId = baseEventData.projectId;
  const todo = await getOrCreateTodo({
    repo: repository.full_name,
    projectId,
    issueNumber: issue.number,
    accessToken: token,
    rootDir: rootPath,
    sourceMap,
    repoSettings,
  });
  if (!todo) {
    console.log(
      `[${repository.full_name}] Error creating todo for issue ${issue.number}. Exiting...`,
    );
    throw new Error("Error creating todo");
  }

  // Fetch or generate research data
  let researchData = await db.research.where({ issueId: issue.number }).all();
  if (!researchData.length) {
    console.log(`[${repository.full_name}] No research found. Researching...`);

    await researchIssue({
      githubIssue: issueText,
      todoId: todo.id,
      issueId: issue.number,
      rootDir: rootPath,
      projectId,
    });
    researchData = await db.research.where({ todoId: todo.id }).all();
  }

  const plan = await getOrGeneratePlan({
    projectId,
    issueId: issue.number,
    githubIssue: issueText,
    rootPath,
  });
  const planSteps = plan.steps;

  const filesToUpdate = planSteps
    .filter((step) => step.type === PlanningAgentActionType.EditExistingCode)
    .map((step) => step.filePath);
  const filesToCreate = planSteps
    .filter((step) => step.type === PlanningAgentActionType.CreateNewCode)
    .map((step) => step.filePath);

  console.log(`[${repository.full_name}] Files to update:`, filesToUpdate);
  console.log(`[${repository.full_name}] Files to create:`, filesToCreate);
  if (!filesToUpdate.length && !filesToCreate.length) {
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
  const detailedMarkdownPlanFromSteps = planSteps
    .map(
      (step, index) => dedent`
        ### Step ${index + 1}: ${step.type === PlanningAgentActionType.EditExistingCode ? "Edit" : "Create"} \`${step.filePath}\`

        **Task:** ${step.title}

        **Instructions:**
        ${step.instructions}

        **Exit Criteria:**
        ${step.exitCriteria}

        ${
          step.dependencies
            ? `**Dependencies:**
        ${step.dependencies}`
            : ""
        }
      `,
    )
    .join("\n");

  const detailedMarkdownResearchData = researchData
    .filter((research) => research.answer?.length)
    .map(
      (research) => dedent`
        ## Question:
        ${research.question}

        ## Answer:
        ${research.answer}
      `,
    )
    .join("\n");

  const codeTemplateParams = {
    sourceMap,
    types,
    packages,
    styles,
    images,
    code,
    issueBody: issueText,
    plan: detailedMarkdownPlanFromSteps,
    research: detailedMarkdownResearchData,
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

  let model: Model = "claude-3-5-sonnet-20241022";
  const codeTokenCount = countTokens(code);
  let updatedCode: string;
  if (codeTokenCount > MAX_OUTPUT[model]) {
    model = "gpt-4o-64k-output-alpha";
  }
  if (codeTokenCount > MAX_OUTPUT[model] * 0.8) {
    // if the estimated output token count is too close to the model's limit, process each step individually to prevent responses getting truncated
    const results = await Promise.all(
      planSteps
        .filter(
          (step) =>
            step.type === PlanningAgentActionType.EditExistingCode ||
            step.type === PlanningAgentActionType.CreateNewCode,
        )
        .map((step) =>
          processStepIndividually(step, {
            rootPath,
            repoSettings,
            baseEventData,
            issueText,
            researchData,
            model,
          }),
        ),
    );

    updatedCode = results.filter(Boolean).join("\n\n");
  } else {
    // Original single request logic
    updatedCode = (await sendGptRequest(
      codeUserPrompt,
      codeSystemPrompt,
      0.2,
      baseEventData,
      3,
      60000,
      undefined,
      model,
    ))!;
  }

  if (updatedCode.length < 10 || !updatedCode.includes("__FILEPATH__")) {
    console.log(`[${repository.full_name}] code`, code);
    console.log(`[${repository.full_name}] No code generated. Exiting...`);
    throw new Error("No code generated");
  }
  const newBranch = generateJacobBranchName(issue.number);

  if (dryRun) {
    console.log("\n***** DRY RUN: UPDATED CODE *****\n\n");
    console.log(updatedCode);
    console.log("\n\n***** END DRY RUN *****\n");
  } else {
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
      baseBranch,
      branch: newBranch,
      repoSettings,
      commitMessage: `JACoB PR for Issue ${issue.title}`,
      issue,
      newPrTitle: `JACoB PR for Issue ${issue.title}`,
      newPrBody: `## Summary:\n\n${issue.body}\n\n## Plan:\n\n${
        detailedMarkdownPlanFromSteps ?? ""
      }`,
      newPrReviewers: issue.assignees?.map((assignee) => assignee.login) ?? [],
    });
  }
}
