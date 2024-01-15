import dedent from "ts-dedent";
import { Repository } from "@octokit/webhooks-types";
import { Endpoints } from "@octokit/types";
import { z } from "zod";

import { getSourceMap, getTypes, getImages } from "../analyze/sourceMap";
import { parseTemplate, RepoSettings } from "../utils";
import { sendGptRequestWithSchema } from "../openai/request";
import { getIssue } from "../github/issue";
import { concatenatePRFiles, createPRReview } from "../github/pr";

type PullRequest =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];

export const CodeReviewSchema = z.object({
  majorIssues: z.string().optional().nullable(), // A *very* detailed code review. Include major issues here such as bugs, incorrect imports or file names, missing functionality such as click handlers, or functions with the functionality commented out. Do not include minor issues here. If there are no major issues, do not include this key.
  minorIssues: z.string().optional().nullable(), // This is a list of minor issues. These are things like extra whitespaces or extra lines at the end of the file. These are things that are not important to fix but are nice to fix if possible.
  isApproved: z.boolean(), // If there are no major issues, this will be true. If there are only minor issues or no major or minor issues, this will be false.
});

export type CodeReview = z.infer<typeof CodeReviewSchema>;

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
  const result = await getIssue(repository, token, issueNumber);
  console.log(
    `Loaded Issue #${issueNumber} associated with PR #${existingPr?.number}`,
  );
  const issue = result.data;

  const sourceMap = getSourceMap(rootPath, repoSettings);
  const types = getTypes(rootPath, repoSettings);
  const images = getImages(rootPath);

  const code = await concatenatePRFiles(
    rootPath,
    repository,
    token,
    existingPr.number,
  );

  const codeReviewTemplateParams = {
    sourceMap,
    types,
    images,
    code,
    issueText: issue.body ?? "",
  };

  const codeReviewSystemPrompt = parseTemplate(
    "dev",
    "code_review",
    "system",
    codeReviewTemplateParams,
    repoSettings,
  );
  const codeReviewUserPrompt = parseTemplate(
    "dev",
    "code_review",
    "user",
    codeReviewTemplateParams,
    repoSettings,
  );
  const codeReview = (await sendGptRequestWithSchema(
    codeReviewUserPrompt,
    codeReviewSystemPrompt,
    CodeReviewSchema,
    0.2,
  )) as CodeReview;

  if (codeReview.isApproved) {
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
      event: "COMMENT",
      body,
    });
  } else {
    const minorIssues = codeReview.minorIssues
      ? dedent`\n
          I also found a few minor issues that I'll try to address as well:

          ${codeReview.minorIssues}
        `
      : "";
    const appUsername = process.env.APP_USERNAME;
    const ottoWillRespond =
      appUsername && `${existingPr.user.id}` === appUsername;
    const willAttemptSuffix = ottoWillRespond
      ? "\nI will attempt to fix these issues and push up a new commit to the PR."
      : "";

    const body = dedent`
      I have performed a code review on this PR and I've found a few issues that need to be addressed.
      
      Here are the main issues I found:

      ${codeReview.majorIssues}
      ${minorIssues}
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
      event: "COMMENT",
      body,
    });
  }
}
