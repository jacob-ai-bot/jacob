import dedent from "ts-dedent";
import { Repository } from "@octokit/webhooks-types";
import { Endpoints } from "@octokit/types";
import { z } from "zod";

import { getSourceMap, getTypes, getImages } from "../analyze/sourceMap";
import { parseTemplate } from "../utils";
import { concatenateFiles } from "../utils/files";
import { sendGptRequestWithSchema } from "../openai/request";
import { getIssue } from "../github/issue";
import { getPRFiles, createPRReview } from "../github/pr";

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
  existingPr: PullRequest,
) {
  const regex = /otto-issue-(\d+)-.*/;
  const match = branch.match(regex);
  const issueNumber = parseInt(match?.[1] ?? "", 10);
  const result = await getIssue(repository, token, issueNumber);
  console.log(
    `Loaded Issue #${issueNumber} associated with PR #${existingPr?.number}`,
  );
  const issue = result.data;

  const prFiles = await getPRFiles(repository, token, existingPr.number);
  const filesToReview = prFiles.data.map(({ filename }) => filename);

  const sourceMap = getSourceMap(rootPath);
  const types = getTypes(rootPath);
  const images = getImages(rootPath);

  console.log("Files to review:", filesToReview);
  if (!filesToReview?.length) {
    console.log("\n\n\n\n^^^^^^\n\n\n\nERROR: No files to review\n\n\n\n");
    throw new Error("No files to review");
  }
  const code = concatenateFiles(rootPath, filesToReview);
  console.log("Concatenated code:\n\n", code);

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
  );
  const codeReviewUserPrompt = parseTemplate(
    "dev",
    "code_review",
    "user",
    codeReviewTemplateParams,
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
    const body = dedent`
      I have performed a code review on this PR and I've found a few issues that need to be addressed.
      
      Here are the main issues I found:

      ${codeReview.majorIssues}
      ${minorIssues}

      I will attempt to fix these issues and push up a new commit to the PR.
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
