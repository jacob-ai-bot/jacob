import { type Issue, type Repository } from "@octokit/webhooks-types";
import { type Endpoints } from "@octokit/types";
import { dedent } from "ts-dedent";

import { getSourceMap, getTypes, getImages } from "../analyze/sourceMap";
import {
  type RepoSettings,
  type BaseEventData,
  parseTemplate,
  extractIssueNumberFromBranchName,
  getStyles,
  generateJacobCommitMessage,
} from "../utils";
import {
  checkAndCommit,
  MAX_ATTEMPTS_TO_FIX_BUILD_ERROR,
} from "./checkAndCommit";
import { addCommentToIssue, getIssue } from "../github/issue";
import { concatenatePRFiles } from "../github/pr";
import { reconstructFiles } from "../utils/files";
import { emitCodeEvent } from "~/server/utils/events";
import {
  countTokens,
  MAX_OUTPUT,
  type Model,
  sendGptRequest,
} from "../openai/request";
import { generateBugfixPlan } from "../utils/plan";
import { type PlanStep } from "../agent/plan";
import {
  assessAndInstallNpmPackages,
  getBuildErrors,
  type ProjectContext,
} from "../agent/bugfix";
import { db } from "../db/db";
import { researchIssue } from "../agent/research";
import { getOrCreateTodo } from "../utils/todos";

export type PullRequest =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];
type RetrievedIssue =
  Endpoints["GET /repos/{owner}/{repo}/issues/{issue_number}"]["response"]["data"];

export interface FixErrorParams extends BaseEventData {
  repository: Repository;
  token: string;
  prIssue: Issue | null;
  body: string | null;
  rootPath: string;
  branch: string;
  existingPr: PullRequest;
  repoSettings?: RepoSettings;
}

async function processStepIndividually(
  step: PlanStep,
  params: {
    code: string;
    issueBody: string;
    errorMessages: string;
    sourceMap: string;
    types: string;
    images: string;
    baseEventData: BaseEventData;
    model: Model;
  },
) {
  const {
    code,
    issueBody,
    errorMessages,
    sourceMap,
    types,
    images,
    baseEventData,
    model,
  } = params;

  const stepString = JSON.stringify(step);

  const codeTemplateParams = {
    code,
    issueBody,
    errorMessages,
    sourceMap,
    types,
    images,
    step: stepString,
  };

  const codeSystemPrompt = parseTemplate(
    "dev",
    "code_fix_error",
    "system",
    codeTemplateParams,
  );
  const codeUserPrompt = parseTemplate(
    "dev",
    "code_fix_error",
    "user",
    codeTemplateParams,
  );

  return sendGptRequest(
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

export async function fixError(params: FixErrorParams) {
  const {
    repository,
    token,
    prIssue,
    body,
    rootPath,
    branch,
    repoSettings,
    existingPr,
    ...baseEventData
  } = params;

  const issueNumber = extractIssueNumberFromBranchName(branch);
  let issue: RetrievedIssue | undefined;
  if (issueNumber) {
    const result = await getIssue(repository, token, issueNumber);
    issue = result.data;
    console.log(
      `[${repository.full_name}] Loaded Issue #${issueNumber} associated with PR #${existingPr?.number}`,
    );
    if (!issue) {
      throw new Error("No issue found");
    }
  } else {
    console.log(
      `[${repository.full_name}] No Issue associated with ${branch} branch for PR #${existingPr?.number}`,
    );
    throw new Error("No issue found");
  }
  const sourceMap = getSourceMap(rootPath, repoSettings);
  const types = getTypes(rootPath, repoSettings);
  const packages = Object.keys(repoSettings?.packageDependencies ?? {}).join(
    "\n",
  );
  const styles = await getStyles(rootPath, repoSettings);
  const images = await getImages(rootPath, repoSettings);
  const projectId = baseEventData.projectId;
  const todo = await getOrCreateTodo({
    repo: repository.full_name,
    projectId,
    issueNumber: issue?.number,
    accessToken: token,
    rootDir: rootPath,
    sourceMap,
    repoSettings,
  });
  if (!todo) {
    throw new Error("No todo found");
  }
  // Fetch or generate research data
  let researchData = await db.research.where({ todoId: todo.id }).all();
  if (!researchData.length) {
    console.log(`[${repository.full_name}] No research found. Researching...`);

    await researchIssue({
      githubIssue: issue?.body ?? "",
      todoId: todo.id,
      issueId: issue?.number,
      rootDir: rootPath,
      projectId,
    });
    researchData = await db.research.where({ todoId: todo.id }).all();
  }
  const research = researchData
    .map((item) => `Question: ${item.question}\nAnswer: ${item.answer}`)
    .join("\n\n");
  if (!research) {
    throw new Error("No research found");
  }

  const projectContext: ProjectContext = {
    baseEventData,
    repository,
    token,
    prIssue,
    body,
    rootPath,
    branch,
    existingPr,
    repoSettings,
    sourceMapOrFileList: sourceMap,
    types,
    packages,
    styles,
    images,
    research,
  };

  let errorInfoArray = await getBuildErrors(projectContext);
  let errors = errorInfoArray
    ?.map(
      (error) =>
        `${error.filePath}: ${error.errorType} - line (${error.lineNumber}): ${error.errorMessage}`,
    )
    .join("\n");
  // Check to see if we need to install npm packages
  const didInstallNpmPackages = await assessAndInstallNpmPackages(
    errors,
    projectContext,
  );
  if (didInstallNpmPackages) {
    console.log(`[${repository.full_name}] Ran npm install, trying again...`);
    errorInfoArray = await getBuildErrors(projectContext);
    errors = errorInfoArray
      ?.map(
        (error) =>
          `${error.filePath}: ${error.errorType} - line (${error.lineNumber}): ${error.errorMessage}`,
      )
      .join("\n");
  }

  const attemptNumber = MAX_ATTEMPTS_TO_FIX_BUILD_ERROR;
  console.log(`[${repository.full_name}] Errors:`, errors);

  console.log(`[${repository.full_name}] Assessment of Error:`, errors);
  if (errorInfoArray.length === 0) {
    console.log(
      `[${repository.full_name}] No errors found in assessment. Exiting...`,
    );
    await checkAndCommit({
      ...baseEventData,
      repository,
      token,
      rootPath,
      branch,
      repoSettings,
      commitMessage: "No errors found in assessment",
      existingPr,
      issue,
      buildErrorAttemptNumber: isNaN(attemptNumber) ? 1 : attemptNumber,
    });
    return;
  }

  try {
    const commitMessage = await generateJacobCommitMessage(
      issue?.title ?? "",
      errors,
    );

    const didInstallNpmPackages = await assessAndInstallNpmPackages(
      errors,
      projectContext,
    );
    if (didInstallNpmPackages) {
      console.log(`[${repository.full_name}] Ran npm install, trying again...`);

      return;
    } else {
      const { code } = await concatenatePRFiles(
        rootPath,
        repository,
        token,
        existingPr.number,
        undefined,
        errorInfoArray?.map((e) => e.filePath),
      );

      const errorMessages = errorInfoArray?.map(
        ({ filePath, lineNumber, errorType, errorMessage }) =>
          `Error in ${filePath}: line(${lineNumber}): ${errorType} - ${errorMessage}`,
      );

      const model: Model = "claude-3-5-sonnet-20241022";
      const codeTokenCount = countTokens(code) * 1.05;

      const plan = await generateBugfixPlan({
        githubIssue: issue?.body ?? "",
        rootPath,
        code,
        errors: errorMessages,
      });

      let updatedCode: string;
      if (codeTokenCount > MAX_OUTPUT[model] * 0.7) {
        const results = await Promise.all(
          plan.steps.map((step) =>
            processStepIndividually(step, {
              code,
              issueBody: issue?.body ?? "",
              errorMessages: errorMessages?.join("\n") ?? "",
              sourceMap,
              types,
              images,
              baseEventData,
              model,
            }),
          ),
        );

        updatedCode = results.filter(Boolean).join("\n\n");
      } else {
        const codeTemplateParams = {
          code,
          issueBody: issue?.body ?? "",
          errorMessages: errorMessages?.join("\n") ?? "",
          sourceMap,
          types,
          images,
        };

        const codeSystemPrompt = parseTemplate(
          "dev",
          "code_fix_error",
          "system",
          codeTemplateParams,
        );
        const codeUserPrompt = parseTemplate(
          "dev",
          "code_fix_error",
          "user",
          codeTemplateParams,
        );

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

      const files = reconstructFiles(updatedCode, rootPath);
      await Promise.all(
        files.map((file) => emitCodeEvent({ ...baseEventData, ...file })),
      );

      await checkAndCommit({
        ...baseEventData,
        repository,
        token,
        rootPath,
        branch,
        repoSettings,
        commitMessage,
        existingPr,
        issue,
        buildErrorAttemptNumber: isNaN(attemptNumber) ? 1 : attemptNumber,
      });
    }
  } catch (error) {
    console.log(`[${repository.full_name}] Error in fixError:`, error);
    if (prIssue) {
      const message = dedent`JACoB here once again...

        Unfortunately, I wasn't able to resolve the error(s).

        Here is some information about the error(s):

        ${errors}
      `;

      await addCommentToIssue(repository, prIssue.number, token, message);
    }
    throw error;
  }
}
