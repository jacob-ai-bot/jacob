import dedent from "ts-dedent";
import { Repository } from "@octokit/webhooks-types";
import { Endpoints } from "@octokit/types";

import { getSourceMap, getTypes } from "../analyze/sourceMap";
import { parseTemplate, RepoSettings } from "../utils";
import { sendGptRequest } from "../openai/request";
import { getIssue } from "../github/issue";
import { concatenatePRFiles, createPRReview, getPRDiff } from "../github/pr";
import {
  type CodeComment,
  extractPRCommentsFromFiles,
  getNewOrModifiedRangesMapFromDiff,
} from "../utils/files";

export type PullRequest =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];
type Issue =
  Endpoints["GET /repos/{owner}/{repo}/issues/{issue_number}"]["response"]["data"];

export async function codeReview(
  repository: Repository,
  token: string,
  rootPath: string,
  branch: string,
  repoSettings: RepoSettings | undefined,
  existingPr: PullRequest,
) {
  const regex = /jacob-issue-(\d+)-.*/;
  const match = branch.match(regex);
  const issueNumber = parseInt(match?.[1] ?? "", 10);
  let issue: Issue | undefined;
  try {
    const result = await getIssue(repository, token, issueNumber);
    issue = result.data;
    console.log(
      `[${repository.full_name}] Loaded Issue #${issueNumber} associated with PR #${existingPr?.number}`,
    );
    // eslint-disable-next-line no-empty
  } catch (e) {}

  const sourceMap = getSourceMap(rootPath, repoSettings);
  const types = getTypes(rootPath, repoSettings);
  const { data: diff } = await getPRDiff(repository, token, existingPr.number);
  const newOrModifiedRangeMap = getNewOrModifiedRangesMapFromDiff(diff);

  const { code, lineLengthMap } = await concatenatePRFiles(
    rootPath,
    repository,
    token,
    existingPr.number,
  );

  const codeReviewTemplateParams = {
    sourceMap,
    types,
    code,
    prTitleAndBody: `${existingPr.title}\n${existingPr.body ?? ""}`,
    issueText: issue ? `${issue.title}\n${issue.body ?? ""}` : "",
    issueHeading: issue ? "-- GitHub Issue:" : "",
    issueInstruction: issue?.body
      ? " and the code written to address the issue."
      : "",
  };

  const codeReviewSystemPrompt = parseTemplate(
    "dev",
    "code_review",
    "system",
    codeReviewTemplateParams,
  );
  const codeReviewUserPrompt = parseTemplate(
    "dev",
    "code_review",
    "user",
    codeReviewTemplateParams,
  );
  const codeWithComments = (await sendGptRequest(
    codeReviewUserPrompt,
    codeReviewSystemPrompt,
    0.2,
  )) as string;

  if (
    codeWithComments.length < 10 ||
    !codeWithComments.includes("__FILEPATH__")
  ) {
    console.log(`[${repository.full_name}] codeWithComments`, codeWithComments);
    console.log(
      `[${repository.full_name}] No codeWithComments generated. Exiting...`,
    );
    throw new Error("No codeWithComments generated");
  }

  const extractedComments = extractPRCommentsFromFiles(codeWithComments);

  // Add side: "RIGHT" to each comment and leverage the lineLengthMap to ensure
  // that comments are not associated with lines that don't exist in the file (the LLM response
  // occasionally adds a line at the end of the file that doesn't exist in the original file)
  const comments = extractedComments
    .map((comment) => {
      const { path, line: suggestedLine } = comment;
      const lineLength = lineLengthMap[path];
      const line = Math.min(suggestedLine, lineLength ? lineLength : Infinity);
      const ranges = newOrModifiedRangeMap[path];
      const appliesToNewOrModifiedCode = ranges?.some(
        (range) => line >= range.start && line <= range.end,
      );
      if (!appliesToNewOrModifiedCode) {
        console.warn(
          `[${repository.full_name}] Comment on line ${line} does not apply to new or modified code (ignoring):`,
          comment,
        );
      }
      return appliesToNewOrModifiedCode
        ? {
            ...comment,
            line,
            side: "RIGHT",
          }
        : undefined;
    })
    .filter(Boolean) as CodeComment[];

  const appUsername = process.env.APP_USERNAME;
  const jacobCreatedThisPR =
    appUsername && `${existingPr.user.id}` === appUsername;

  if (comments.length === 0) {
    const body =
      "I have performed a code review on this PR and found no issues. Looks good!";

    // Unfortunately, github does not allow a user/bot to "APPROVE" a PR
    // created by the same user/bot. So we have to just create a review comment
    // on the PR.
    await createPRReview({
      repository,
      token,
      pull_number: existingPr.number,
      commit_id: existingPr.head.sha,
      event: jacobCreatedThisPR ? "COMMENT" : "APPROVE",
      body,
    });
  } else {
    const willAttemptSuffix = jacobCreatedThisPR
      ? "\nI will attempt to fix these issues and push up a new commit to the PR."
      : "";

    const body = dedent`
      I have performed a code review on this PR and I've added some comments.
      ${willAttemptSuffix}
    `;
    // Unfortunately, github does not allow a user/bot to "REQUEST_CHANGES" on a PR
    // created by the same user/bot. So we have to just create a review comment
    // on the PR.
    await createPRReview({
      repository,
      token,
      pull_number: existingPr.number,
      commit_id: existingPr.head.sha,
      event: jacobCreatedThisPR ? "COMMENT" : "REQUEST_CHANGES",
      body,
      comments,
    });
  }
}
