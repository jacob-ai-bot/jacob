import { Issue, Repository } from "@octokit/webhooks-types";
import { Endpoints } from "@octokit/types";
import dedent from "ts-dedent";

import { getSourceMap, getTypes, getImages } from "../analyze/sourceMap";
import { RepoSettings, parseTemplate } from "../utils";
import { sendGptRequest } from "../openai/request";
import { assessBuildError } from "./assessBuildError";
import { runNpmInstall } from "../build/node/check";
import { checkAndCommit } from "./checkAndCommit";
import { addCommentToIssue, getIssue } from "../github/issue";
import { concatenatePRFiles } from "../github/pr";
import { reconstructFiles } from "../utils/files";

export type PullRequest =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];

export async function fixError(
  repository: Repository,
  token: string,
  prIssue: Issue | null,
  body: string | null,
  rootPath: string,
  branch: string,
  repoSettings: RepoSettings | undefined,
  existingPr: PullRequest,
) {
  const regex = /jacob-issue-(\d+)-.*/;
  const match = branch.match(regex);
  const issueNumber = parseInt(match?.[1] ?? "", 10);
  const result = await getIssue(repository, token, issueNumber);
  console.log(
    `[${repository.full_name}] Loaded Issue #${issueNumber} associated with PR #${existingPr?.number}`,
  );
  const issue = result.data;

  const buildErrorSection = (body?.split("## Error Message") ?? [])[1];
  const headingEndMarker = "\n\n";
  const nextHeadingMarker = "## ";
  const afterHeadingIndex = (buildErrorSection ?? "").indexOf(headingEndMarker);
  const restOfHeading =
    afterHeadingIndex === -1
      ? ""
      : buildErrorSection.slice(0, afterHeadingIndex);
  const attemptNumber = parseInt(
    restOfHeading.match(/Attempt\s+Number\s+(\d+)/)?.[1] ?? "",
    10,
  );
  const errors =
    afterHeadingIndex === -1
      ? ""
      : buildErrorSection
          .slice(afterHeadingIndex + headingEndMarker.length)
          .split(nextHeadingMarker)[0];

  const assessment = await assessBuildError(errors);
  console.log(`[${repository.full_name}] Assessment of Error:`, assessment);

  try {
    const commitMessageBase = "JACoB fix error: ";
    const commitMessage = `${commitMessageBase}${assessment.suggestedFixes}`;

    if (assessment.needsNpmInstall && assessment.npmPackageToInstall) {
      console.log(`[${repository.full_name}] Needs npm install`);

      await runNpmInstall(
        rootPath,
        assessment.npmPackageToInstall.trim(),
        repoSettings,
      );

      await checkAndCommit({
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
    } else {
      const code = await concatenatePRFiles(
        rootPath,
        repository,
        token,
        existingPr.number,
      );

      const { causeOfErrors, ideasForFixingError, suggestedFixes } = assessment;
      const sourceMap = getSourceMap(rootPath, repoSettings);
      const types = getTypes(rootPath, repoSettings);
      const images = await getImages(rootPath, repoSettings);

      const codeTemplateParams = {
        code,
        issueBody: issue.body ?? "",
        causeOfErrors,
        ideasForFixingError,
        suggestedFixes,
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
      const updatedCode = (await sendGptRequest(
        codeUserPrompt,
        codeSystemPrompt,
        0.2,
      )) as string;

      if (updatedCode.length < 10 || !updatedCode.includes("__FILEPATH__")) {
        console.log(`[${repository.full_name}] code`, code);
        console.log(`[${repository.full_name}] No code generated. Exiting...`);
        throw new Error("No code generated");
      }

      reconstructFiles(updatedCode, rootPath);

      await checkAndCommit({
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
    if (prIssue) {
      const message = dedent`JACoB here once again...

        Unfortunately, I wasn't able to resolve this error.

        Here is some information about the error:
        
        ${assessment.causeOfErrors}

        Here are some ideas for fixing the error:
        
        ${assessment.ideasForFixingError}

        Here is the suggested fix:
        
        ${assessment.suggestedFixes}
      `;

      await addCommentToIssue(repository, prIssue.number, token, message);
    }
    throw error;
  }
}
