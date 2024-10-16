import { type Issue, type Repository } from "@octokit/webhooks-types";
import {
  parseTemplate,
  constructNewOrEditSystemPrompt,
  type RepoSettings,
  type BaseEventData,
  generateJacobBranchName,
  getStyles,
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
import { createTodo } from "../utils/todos";
import { getTypes, getImages } from "../analyze/sourceMap";
import { saveImages } from "../utils/images";
import { getOrGeneratePlan } from "../utils/plan";
import { type PlanStep } from "~/server/agent/plan";
import { PlanningAgentActionType } from "../db/enums";

export interface EditFilesParams extends BaseEventData {
  repository: Repository;
  token: string;
  issue: Issue;
  rootPath: string;
  sourceMap: string;
  dryRun?: boolean;
  repoSettings?: RepoSettings;
}

export async function editFiles(params: EditFilesParams) {
  const {
    repository,
    token,
    issue,
    rootPath,
    sourceMap,
    dryRun,
    repoSettings,
    ...baseEventData
  } = params;

  const snapshotUrl = getSnapshotUrl(issue.body);
  const issueBody = issue.body ? `\n${issue.body}` : "";
  const issueText = issue.title + issueBody;

  // Fetch or generate research data
  let researchData = await db.research.where({ issueId: issue.number }).all();
  const projectId = baseEventData.projectId;
  if (!researchData.length) {
    console.log(`[${repository.full_name}] No research found. Researching...`);
    let todo = await db.todos.findByOptional({
      issueId: issue.number,
      projectId,
    });
    if (!todo) {
      console.log(
        `[${repository.full_name}] No todo found for issue ${issue.number}. Creating todo...`,
      );
      todo = await createTodo(
        repository.full_name,
        projectId,
        issue.number,
        token,
      );
      if (!todo) {
        console.log(
          `[${repository.full_name}] Error creating todo for issue ${issue.number}. Exiting...`,
        );
        throw new Error("Error creating todo");
      }
    }
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

  const codeTemplateParams = {
    sourceMap,
    types,
    packages,
    styles,
    images,
    code,
    issueBody: issueText,
    plan: JSON.stringify(planSteps, null, 2),
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

    const detailedMarkdownPlanFromSteps = planSteps
      .map(
        (step, index) => `
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
        detailedMarkdownPlanFromSteps ?? ""
      }`,
      newPrReviewers: issue.assignees?.map((assignee) => assignee.login) ?? [],
    });
  }
}
