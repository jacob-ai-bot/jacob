import { dedent } from "ts-dedent";
import { type Repository } from "@octokit/webhooks-types";
import { type Endpoints } from "@octokit/types";

import { generateCodeReviewPlan } from "../utils/plan";
import { getSourceMap, getTypes, getImages } from "../analyze/sourceMap";
import { parseTemplate, type RepoSettings, type BaseEventData } from "../utils";
import { reconstructFiles } from "../utils/files";
import { sendGptRequest } from "../openai/request";
import { getPRReviewComments, concatenatePRFiles } from "../github/pr";
import { checkAndCommit } from "./checkAndCommit";
import { applyCodePatchesViaLLM } from "../agent/patch";
import { emitCodeEvent } from "~/server/utils/events";

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
    commentsOnSpecificLines,
    reviewBody,
    rootPath,
    code,
  });

  for (const step of plan.steps) {
    const { filePath, instructions } = step;
    const codeTemplateParams = {
      filePath,
      instructions,
      code,
      sourceMap,
      types,
      images,
    };
    const codeSystemPrompt = parseTemplate(
      "dev",
      "code_edit_existing_file",
      "system",
      codeTemplateParams,
    );
    const codeUserPrompt = parseTemplate(
      "dev",
      "code_edit_existing_file",
      "user",
      codeTemplateParams,
    );

    const updatedCode = await applyCodePatchesViaLLM(
      rootPath,
      filePath,
      codeUserPrompt,
      codeSystemPrompt,
      baseEventData,
      repoSettings,
      "gpt-4",
    );

    if (!updatedCode.length) {
      console.log(
        `[${repository.full_name}] No code generated for ${filePath}. Skipping...`,
      );
      continue;
    }

    await emitCodeEvent({ ...baseEventData, ...updatedCode[0] });
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
