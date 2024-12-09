import { dedent } from "ts-dedent";
import { type Repository } from "@octokit/webhooks-types";
import { type Endpoints } from "@octokit/types";

import { getSourceMap, getTypes, getImages } from "../analyze/sourceMap";
import { type RepoSettings, type BaseEventData } from "../utils";
import { generateCodeReviewPlan } from "../utils/plan";
import { applyCodePatchViaLLM } from "../agent/patch";
import { getPRReviewComments } from "../github/pr";
import { checkAndCommit } from "./checkAndCommit";

type PullRequest =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];

export interface RespondToCodeReviewParams extends BaseEventData {
  repository: Repository;
  token: string;
  rootPath: string;
  repoSettings?: RepoSettings;
  branch: string;
  existingPr: PullRequest;
  _state: "changes_requested" | "commented"; // Prefix with _ to mark as intentionally unused
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
    reviewId,
    reviewBody,
    ...baseEventData
  } = params;

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

  const plan = await generateCodeReviewPlan({
    commentsOnSpecificLines,
    reviewBody: reviewBody ?? "",
    rootPath,
  });

  for (const step of plan.steps) {
    const { filePath, instructions } = step;
    await applyCodePatchViaLLM(rootPath, filePath, instructions, false, 0);
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
