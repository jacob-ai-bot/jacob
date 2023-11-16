import { Octokit } from "@octokit/rest";
import { Repository } from "@octokit/webhooks-types";
import { graphql } from "@octokit/graphql";
import { MarkPullRequestReadyForReviewPayload } from "@octokit/graphql-schema";

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
    userAgent: "otto",
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

export async function getPR(
  repository: Repository,
  token: string,
  pull_number: number,
) {
  const octokit = new Octokit({
    auth: token,
    log: console,
    userAgent: "otto",
  });

  return octokit.pulls.get({
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
