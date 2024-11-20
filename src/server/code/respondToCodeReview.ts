import { dedent } from "ts-dedent";
import { type Repository } from "@octokit/webhooks-types";
import { type Endpoints } from "@octokit/types";

import { getSourceMap, getTypes, getImages } from "../analyze/sourceMap";
import { parseTemplate, type RepoSettings, type BaseEventData } from "../utils";
import { reconstructFiles } from "../utils/files";
import { sendGptRequest } from "../openai/request";
import { getPRReviewComments, concatenatePRFiles } from "../github/pr";
import { checkAndCommit } from "./checkAndCommit";
import { emitCodeEvent } from "~/server/utils/events";
import { generateCodeReviewPlan } from "../utils/plan";

type PullRequest =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];

export interface RespondToCodeReviewParams extends BaseEventData {
  repository: Repository;
  token: string;
  rootPath: string;
  repoSettings?: RepoSettings;
  branch: string;
  existingPr: PullRequest;
  state: "changes_requested" | "commented";
  reviewId: number;
  reviewBody: string | null;
}

export async function respondToCodeReview(params: RespondToCodeReviewParams) {
  const {
    repository,
    token,
    rootPath,
    repoSettings,
    branch,
    existingPr,
    state,
    reviewId,
    reviewBody,
    ...baseEventData
  } = params;
  const sourceMap = getSourceMap(rootPath, repoSettings);
  const types = getTypes(rootPath, repoSettings);
  const images = await getImages(rootPath, repoSettings);

  const prComments = await getPRReviewComments(
    repository,
    token,
    existingPr.number,
    reviewId,
  );

  const commentsOnSpecificLines = prComments.data
    .map(
      ({ diff_hunk, path, body, position }) =>
        dedent`
          File: ${path}
          Position: ${position}
          Diff Hunk:
          ${diff_hunk}

          Comment: ${body}
        
        `,
    )
    .join("\n");

  const { code } = await concatenatePRFiles(
    rootPath,
    repository,
    token,
    existingPr.number,
  );

  const plan = await generateCodeReviewPlan({
    githubIssue: reviewBody ?? "",
    rootPath,
    commentsOnSpecificLines,
    reviewBody: reviewBody ?? "",
    code,
    sourceMap,
    types,
    images,
  });

  for (const step of plan.steps) {
    const codeTemplateParams = {
      sourceMap,
      types,
      images,
      code,
      reviewBody: reviewBody ?? "",
      reviewAction:
        state === "changes_requested" ? "requested changes" : "commented",
      commentsOnSpecificLines,
      step,
    };

    const codeSystemPrompt = parseTemplate(
      "dev",
      "code_respond_to_code_review",
      "system",
      codeTemplateParams,
    );
    const codeUserPrompt = parseTemplate(
      "dev",
      "code_respond_to_code_review",
      "user",
      codeTemplateParams,
    );

    const updatedCode =
      (await sendGptRequest(
        codeUserPrompt,
        codeSystemPrompt,
        0.2,
        baseEventData,
        3,
        60000,
      )) ?? "";

    if (updatedCode.length < 10 || !updatedCode.includes("__FILEPATH__")) {
      console.log(`[${repository.full_name}] code`, code);
      console.log(`[${repository.full_name}] No code generated. Exiting...`);
      throw new Error("No code generated");
    }

    const files = reconstructFiles(updatedCode, rootPath);
    await Promise.all(
      files.map((file) => emitCodeEvent({ ...baseEventData, ...file })),
    );
  }

  await checkAndCommit({
    ...baseEventData,
    repository,
    token,
    rootPath,
    branch,
    repoSettings,
    commitMessage: "JACoB commit: respond to PR feedback",
    existingPr,
  });
}
