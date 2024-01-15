import { Repository } from "@octokit/webhooks-types";
import { Endpoints } from "@octokit/types";

import { getSourceMap, getTypes, getImages } from "../analyze/sourceMap";
import { parseTemplate, RepoSettings } from "../utils";
import { reconstructFiles } from "../utils/files";
import { sendGptRequest } from "../openai/request";
import { concatenatePRFiles } from "../github/pr";
import { checkAndCommit } from "./checkAndCommit";

type PullRequest =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];

export async function respondToCodeReview(
  repository: Repository,
  token: string,
  rootPath: string,
  repoSettings: RepoSettings | undefined,
  branch: string,
  existingPr: PullRequest,
  state: "changes_requested" | "commented",
  reviewBody: string | null,
) {
  const sourceMap = getSourceMap(rootPath, repoSettings);
  const types = getTypes(rootPath, repoSettings);
  const images = getImages(rootPath);

  const code = await concatenatePRFiles(
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
    repoSettings,
  );
  const responseToCodeReviewUserPrompt = parseTemplate(
    "dev",
    "code_respond_to_code_review",
    "user",
    respondToCodeReviewTemplateParams,
    repoSettings,
  );

  // Call sendGptRequest with the review text and concatenated code file
  const updatedCode = (await sendGptRequest(
    responseToCodeReviewUserPrompt,
    responseToCodeReviewSystemPrompt,
    0.2,
  )) as string;

  if (updatedCode.length < 10 || !updatedCode.includes("__FILEPATH__")) {
    console.log("code", code);
    console.log("No code generated. Exiting...");
    throw new Error("No code generated");
  }

  // if the first line of the diff starts with ``` then it is a code block. Remove the first line.
  // TODO: move this to the prompt and accept an answer that can be parsed with Zod. If it fails validation, try again with the validation error message.
  const realCode = updatedCode.startsWith("```")
    ? updatedCode.split("```").slice(1).join("")
    : updatedCode;

  reconstructFiles(realCode, rootPath);

  await checkAndCommit({
    repository,
    token,
    rootPath,
    branch,
    commitMessage: "JACoB commit: respond to PR feedback",
    existingPr,
  });
}
