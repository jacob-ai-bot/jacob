import { type Repository } from "@octokit/webhooks-types";
import { type Endpoints } from "@octokit/types";

import { getSourceMap, getTypes, getImages } from "../analyze/sourceMap";
import { parseTemplate, type RepoSettings, type BaseEventData } from "../utils";
import { reconstructFiles } from "../utils/files";
import { sendGptRequest } from "../openai/request";
import { concatenatePRFiles } from "../github/pr";
import { checkAndCommit } from "./checkAndCommit";
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
    reviewBody,
    ...baseEventData
  } = params;
  const sourceMap = getSourceMap(rootPath, repoSettings);
  const types = getTypes(rootPath, repoSettings);
  const images = await getImages(rootPath, repoSettings);

  const { code } = await concatenatePRFiles(
    rootPath,
    repository,
    token,
    existingPr.number,
  );

  const respondToCodeReviewTemplateParams = {
    sourceMap,
    types,
    images,
    code,
    reviewBody: reviewBody ?? "",
    reviewAction:
      state === "changes_requested" ? "requested changes" : "commented",
  };

  const responseToCodeReviewSystemPrompt = parseTemplate(
    "dev",
    "code_respond_to_code_review",
    "system",
    respondToCodeReviewTemplateParams,
  );
  const responseToCodeReviewUserPrompt = parseTemplate(
    "dev",
    "code_respond_to_code_review",
    "user",
    respondToCodeReviewTemplateParams,
  );

  // Call sendGptRequest with the review text and concatenated code file
  const updatedCode =
    (await sendGptRequest(
      responseToCodeReviewUserPrompt,
      responseToCodeReviewSystemPrompt,
      0.2,
      baseEventData,
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

  await checkAndCommit({
    repository,
    token,
    rootPath,
    branch,
    repoSettings,
    commitMessage: "JACoB commit: respond to PR feedback",
    existingPr,
  });
}
