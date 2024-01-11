import { Octokit } from "@octokit/rest";
import { Repository } from "@octokit/webhooks-types";
import { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods";
import { graphql } from "@octokit/graphql";
import { MarkPullRequestReadyForReviewPayload } from "@octokit/graphql-schema";
import path from "path";

import { concatenateFiles } from "../utils/files";

export type PREvent =
  RestEndpointMethodTypes["pulls"]["createReview"]["parameters"]["event"];

export async function createPR(
  repository: Repository,
  token: string,
  newBranch: string,
  title: string,
  body: string,
  reviewers: string[],
  draft?: boolean,
) {
  const octokit = new Octokit({
    auth: token,
    log: console,
    userAgent: "jacob",
  });

  const result = await octokit.pulls.create({
    owner: repository.owner.login,
    repo: repository.name,
    title,
    head: newBranch,
    base: repository.default_branch,
    body,
    draft,
  });

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
  commit_id,
  event,
}: {
  repository: Repository;
  token: string;
  pull_number: number;
  body?: string;
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

export async function concatenatePRFiles(
  rootPath: string,
  repository: Repository,
  token: string,
  prNumber: number,
) {
  const prFiles = await getPRFiles(repository, token, prNumber);
  const relevantFileNames = prFiles.data
    .map(({ filename }) => filename)
    .filter((filename) => !(path.basename(filename) === "package-lock.json"));

  if (relevantFileNames.length === 0) {
    console.log("\n\n\n\n^^^^^^\n\n\n\nERROR: No files changed in PR\n\n\n\n");
    throw new Error("No relevant files changed in PR");
  }
  return concatenateFiles(rootPath, relevantFileNames);
}
