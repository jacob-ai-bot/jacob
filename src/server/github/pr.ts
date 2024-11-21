import { Octokit } from "@octokit/rest";
import type { OctokitResponse } from "@octokit/types";
import type { Repository } from "@octokit/webhooks-types";
import type { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods";
import { graphql } from "@octokit/graphql";
import type { MarkPullRequestReadyForReviewPayload } from "@octokit/graphql-schema";
import path from "path";
import { posthogClient } from "~/server/analytics/posthog";

import { concatenateFiles, type FilesRangesMap } from "../utils/files";

export type PREvent =
  RestEndpointMethodTypes["pulls"]["createReview"]["parameters"]["event"];
export type PRComments =
  RestEndpointMethodTypes["pulls"]["createReview"]["parameters"]["comments"];

interface ErrorWithStatus {
  status: number;
  [key: string]: unknown;
}

// Type guard to check if the error has a "status" property
function isErrorWithStatus(error: unknown): error is ErrorWithStatus {
  return (
    error !== null &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as ErrorWithStatus).status === "number"
  );
}

export async function createPR(
  repository: Repository,
  token: string,
  newBranch: string,
  title: string,
  body: string,
  reviewers: string[],
  baseBranch?: string,
  draft?: boolean,
) {
  const octokit = new Octokit({
    auth: token,
    log: console,
    userAgent: "jacob",
  });

  let result;

  try {
    result = await octokit.pulls.create({
      owner: repository.owner.login,
      repo: repository.name,
      title,
      head: newBranch,
      base: baseBranch ?? repository.default_branch,
      body,
      draft,
    });
    console.log("Pull request created:", result.data.html_url);

    posthogClient.capture({
      distinctId: repository.owner.id.toString(),
      event: "Pull Request Created",
      properties: {
        repository: repository.full_name,
        pullRequestNumber: result.data.number,
        title: result.data.title,
        branch: newBranch,
        baseBranch: baseBranch ?? repository.default_branch,
        isDraft: draft ?? false,
        reviewers: reviewers,
      },
    });
  } catch (error) {
    if (isErrorWithStatus(error) && error.status === 422) {
      // If a 422 error is caught, the user does not have draft PRs enabled. Try again with draft set to false.
      console.log(
        "Draft pull request creation failed due to a 422 error, trying without draft...",
      );
      result = await octokit.pulls.create({
        owner: repository.owner.login,
        repo: repository.name,
        title,
        head: newBranch,
        base: baseBranch ?? repository.default_branch,
        body,
        draft: false, // retry with draft set to false
      });
      console.log("Non-draft pull request created:", result.data.html_url);

      posthogClient.capture({
        distinctId: repository.owner.id.toString(),
        event: "Pull Request Created",
        properties: {
          repository: repository.full_name,
          pullRequestNumber: result.data.number,
          title: result.data.title,
          branch: newBranch,
          baseBranch: baseBranch ?? repository.default_branch,
          isDraft: false,
          reviewers: reviewers,
          retryAfterDraftError: true,
        },
      });
    } else {
      // If the error code is not 422, rethrow the error
      throw error;
    }
  }

  if (reviewers.length > 0) {
    await octokit.pulls.requestReviewers({
      owner: repository.owner.login,
      repo: repository.name,
      pull_number: result.data.number,
      reviewers,
    });
  }

  return result;
}

export async function createPRReview({
  repository,
  token,
  pull_number,
  body,
  comments,
  commit_id,
  event,
}: {
  repository: Repository;
  token: string;
  pull_number: number;
  body?: string;
  comments?: PRComments;
  commit_id?: string;
  event?: PREvent;
}) {
  const octokit = new Octokit({
    auth: token,
    log: console,
    userAgent: "jacob",
  });

  return octokit.pulls.createReview({
    owner: repository.owner.login,
    repo: repository.name,
    commit_id,
    event,
    pull_number,
    body,
    comments,
  });
}

export async function getPR(
  repository: Repository,
  token: string,
  pull_number: number,
) {
  const octokit = new Octokit({
    auth: token,
    log: console,
    userAgent: "jacob",
  });

  return octokit.pulls.get({
    owner: repository.owner.login,
    repo: repository.name,
    pull_number,
  });
}

export async function getPRDiff(
  repository: Repository,
  token: string,
  pull_number: number,
) {
  const octokit = new Octokit({
    auth: token,
    log: console,
    userAgent: "jacob",
  });

  return octokit.pulls.get({
    owner: repository.owner.login,
    repo: repository.name,
    pull_number,
    mediaType: { format: "diff" },
  }) as unknown as Promise<OctokitResponse<string>>;
}

export async function getPRFiles(
  repository: Repository,
  token: string,
  pull_number: number,
) {
  const octokit = new Octokit({
    auth: token,
    log: console,
    userAgent: "jacob",
  });

  return octokit.pulls.listFiles({
    owner: repository.owner.login,
    repo: repository.name,
    pull_number,
  });
}

export async function markPRReadyForReview(
  token: string,
  pullRequestId: string,
) {
  const graphqlWithAuth = graphql.defaults({
    headers: {
      Authorization: `token ${token}`,
    },
  });

  const mutation = `
    mutation MarkPullRequestReadyForReview($pullRequestId: ID!) {
      markPullRequestReadyForReview(input: { pullRequestId: $pullRequestId }) {
        pullRequest {
          isDraft
        }
      }
    }`;

  return graphqlWithAuth<MarkPullRequestReadyForReviewPayload>({
    query: mutation,
    pullRequestId,
  });
}

export async function getPRReviewComments(
  repository: Repository,
  token: string,
  prNumber: number,
  reviewId: number,
) {
  const octokit = new Octokit({
    auth: token,
    log: console,
    userAgent: "jacob",
  });

  return octokit.pulls.listCommentsForReview({
    owner: repository.owner.login,
    repo: repository.name,
    pull_number: prNumber,
    review_id: reviewId,
  });
}

export async function concatenatePRFiles(
  rootPath: string,
  repository: Repository,
  token: string,
  prNumber: number,
  newOrModifiedRangeMap?: FilesRangesMap,
  fileNamesToInclude?: string[],
  fileNamesToCreate?: null | string[],
) {
  const prFiles = await getPRFiles(repository, token, prNumber);
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".svg"];
  const packageLockFiles = [
    "package-lock.json", // npm
    "yarn.lock", // Yarn
    "pnpm-lock.yaml", // pnpm
    "bun.lockb", // bun
  ];

  const prFileNames = prFiles.data
    .map(({ filename }) => filename)
    .filter((filename) => {
      const isPackageLock = packageLockFiles.includes(path.basename(filename));
      const isImageFile = imageExtensions.includes(path.extname(filename));
      return !(isPackageLock || isImageFile);
    });

  const relevantFileNames = [
    ...new Set([...prFileNames, ...(fileNamesToInclude ?? [])]),
  ];

  if (relevantFileNames.length === 0 && fileNamesToCreate?.length === 0) {
    console.log(
      "\n\n\n\n^^^^^^\n\n\n\n[${repository.full_name}] ERROR: No files changed in PR\n\n\n\n",
    );
    throw new Error("No relevant files changed in PR");
  }
  return concatenateFiles(
    rootPath,
    newOrModifiedRangeMap,
    relevantFileNames,
    fileNamesToCreate,
  );
}
