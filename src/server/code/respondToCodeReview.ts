import { Repository } from "@octokit/webhooks-types";
import { Endpoints } from "@octokit/types";

import { getSourceMap, getTypes, getImages } from "../analyze/sourceMap";
import { parseTemplate } from "../utils";
import { concatenateFiles, reconstructFiles } from "../utils/files";
import { sendGptRequest } from "../openai/request";
import { getPRFiles } from "../github/pr";
import { checkAndCommit } from "./checkAndCommit";

type PullRequest =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];

export async function respondToCodeReview(
  repository: Repository,
  token: string,
  rootPath: string,
  branch: string,
  existingPr: PullRequest,
  state: "changes_requested" | "commented",
  reviewBody: string | null,
) {
  const prFiles = await getPRFiles(repository, token, existingPr.number);
  const filesChangedInPR = prFiles.data.map(({ filename }) => filename);

  const sourceMap = getSourceMap(rootPath);
  const types = getTypes(rootPath);
  const images = getImages(rootPath);

  console.log("Files changed in PR:", filesChangedInPR);
  if (!filesChangedInPR?.length) {
    console.log("\n\n\n\n^^^^^^\n\n\n\nERROR: No files changed in PR\n\n\n\n");
    throw new Error("No files to review");
  }
  const code = concatenateFiles(rootPath, filesChangedInPR);
  console.log("Concatenated code:\n\n", code);

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
    commitMessage: "Otto commit: respond to PR feedback",
    existingPr,
  });
}
