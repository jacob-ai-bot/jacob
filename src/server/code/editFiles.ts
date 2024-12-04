import { dedent } from "ts-dedent";
import { type Issue, type Repository } from "@octokit/webhooks-types";
import {
  parseTemplate,
  type RepoSettings,
  type BaseEventData,
  generateJacobBranchName,
  type TemplateParams,
} from "../utils";
import { countTokens, MAX_OUTPUT, type Model } from "../openai/request";
import { setNewBranch } from "../git/branch";
import { checkAndCommit } from "./checkAndCommit";
import {
  type FileContent,
  concatenateFiles,
  isValidExistingFile,
  isValidNewFileName,
  reconstructFiles,
} from "../utils/files";
import { emitCodeEvent } from "../utils/events";
import { db } from "../db/db";
import { researchIssue } from "../agent/research";
import { getOrCreateTodo } from "../utils/todos";
import { getOrGeneratePlan } from "../utils/plan";
import { PlanningAgentActionType } from "../db/enums";
import { sendSelfConsistencyChainOfThoughtGptRequest } from "../openai/utils";
import { applyCodePatchesViaLLM } from "../agent/patch";

export interface EditFilesParams extends BaseEventData {
  repository: Repository;
  token: string;
  issue: Issue;
  rootPath: string;
  sourceMap: string;
  baseBranch?: string;
  dryRun?: boolean;
  agentEnabled?: boolean;
  repoSettings?: RepoSettings;
}

interface GenerateCodeViaPatchParams {
  rootPath: string;
  filesToUpdate: string[];
  filesToCreate: string[];
  codeTemplateParams: TemplateParams;
  baseEventData: BaseEventData;
  dryRun?: boolean;
}

const generateCodeViaPatch = async ({
  rootPath,
  codeTemplateParams,
  filesToUpdate,
  filesToCreate,
  baseEventData,
  dryRun = false,
}: GenerateCodeViaPatchParams): Promise<string> => {
  const codeSystemPrompt = parseTemplate(
    "dev",
    "code_edit_all_files_diff",
    "system",
    codeTemplateParams,
  );
  const codeUserPrompt = parseTemplate(
    "dev",
    "code_edit_all_files_diff",
    "user",
    codeTemplateParams,
  );

  const response = (await sendSelfConsistencyChainOfThoughtGptRequest(
    codeUserPrompt,
    codeSystemPrompt,
    0.2,
    baseEventData,
    2,
    60000,
    undefined,
  ))!;

  const patchMatch = response?.match(/<code_patch>([\s\S]*?)<\/code_patch>/);
  const patch = patchMatch?.[1] ? patchMatch[1].trim() : "";

  if (!patch) {
    return response;
  }

  if (patch && !dryRun) {
    let patchResult: FileContent[] | undefined;
    // try {
    //   patchResult = await applyCodePatch(rootPath, patch);
    // } catch (e) {
    //   // Stash in case we have a partially applied local patch that failed
    //   await gitStash({ directory: rootPath, baseEventData });
    //   console.log(
    //     `Will attempt applyCodePatchViaLLM() since local applyCodePatch failed with ${String(
    //       e,
    //     )}`,
    //   );
    // }

    const files =
      patchResult ??
      (await applyCodePatchesViaLLM({
        rootPath,
        filesToUpdate,
        filesToCreate,
        patch,
      }));
    return files
      .map((file) => `__FILEPATH__${file.filePath}\n${file.codeBlock}`)
      .join("\n\n");
  }

  return response;
};

export async function editFiles(params: EditFilesParams) {
  const {
    repository,
    token,
    issue,
    rootPath,
    sourceMap,
    baseBranch,
    dryRun,
    agentEnabled,
    repoSettings,
    ...baseEventData
  } = params;

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
    agentEnabled,
    repoSettings,
  });
  if (!todo) {
    console.log(
      `[${repository.full_name}] Error creating todo for issue ${issue.number}. Exiting...`,
    );
    throw new Error("Error creating todo");
  }

  // Fetch or generate research data
  let researchData = await db.research.where({ todoId: todo.id }).all();
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
    .filter((step) => isValidExistingFile(step.filePath, rootPath))
    .map((step) => step.filePath);
  const filesToCreate = planSteps
    .filter((step) => step.type === PlanningAgentActionType.CreateNewCode)
    .filter((step) => isValidNewFileName(step.filePath))
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

  // const types = getTypes(rootPath, repoSettings);
  // const packages = Object.keys(repoSettings?.packageDependencies ?? {}).join(
  //   "\n",
  // );
  // const styles = await getStyles(rootPath, repoSettings);
  // let images = await getImages(rootPath, repoSettings);
  // images = await saveImages(images, issue?.body, rootPath, repoSettings);
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
    code,
    issueText,
    plan: detailedMarkdownPlanFromSteps,
    research: detailedMarkdownResearchData,
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

  const model: Model = "claude-3-5-sonnet-20241022";
  const codeTokenCount = countTokens(code);
  let updatedCode: string;

  if (codeTokenCount > MAX_OUTPUT[model] * 0.5) {
    updatedCode = await generateCodeViaPatch({
      rootPath,
      filesToUpdate,
      filesToCreate,
      codeTemplateParams,
      baseEventData,
      dryRun,
    });
  } else {
    updatedCode = (await sendSelfConsistencyChainOfThoughtGptRequest(
      codeUserPrompt,
      codeSystemPrompt,
      0.2,
      baseEventData,
      2,
      60000,
      undefined,
    ))!;
  }

  if (updatedCode.length < 10 || !updatedCode.includes("__FILEPATH__")) {
    console.log(`[${repository.full_name}] code`, code);
    console.log(`[${repository.full_name}] No code generated. Exiting...`);
    throw new Error("No code generated");
  }
  const newBranch = await generateJacobBranchName(
    issue.number,
    issue.title,
    issue.body ?? "",
  );

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
