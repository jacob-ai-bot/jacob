import dedent from "ts-dedent";
import { describe, test, expect, afterEach, afterAll, vi } from "vitest";
import { Issue, Repository } from "@octokit/webhooks-types";

import issueCommentCreatedPRCommandFixBuildErrorPayload from "../../data/test/webhooks/issue_comment.created.prCommand.fixBuildError.json";
import {
  checkAndCommit,
  MAX_ATTEMPTS_TO_FIX_BUILD_ERROR,
  type PullRequest,
} from "./checkAndCommit";

const mockedCheck = vi.hoisted(() => ({
  runBuildCheck: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(undefined))),
}));
vi.mock("../build/node/check", () => mockedCheck);

const mockedCommit = vi.hoisted(() => ({
  addCommitAndPush: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(undefined))),
}));
vi.mock("../git/commit", () => mockedCommit);

const mockedFS = vi.hoisted(() => ({
  default: {
    existsSync: vi.fn().mockImplementation(() => true),
  },
}));
vi.mock("fs", () => mockedFS);

const mockedPR = vi.hoisted(() => ({
  createPR: vi.fn().mockImplementation(
    () =>
      new Promise((resolve) =>
        resolve({
          data: {
            number: 70,
            title: "created-pr-title",
            prUrl: "https://github.com/created-pr-url",
          },
        }),
      ),
  ),
  markPRReadyForReview: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(undefined))),
}));
vi.mock("../github/pr", () => mockedPR);

const mockedIssue = vi.hoisted(() => ({
  getIssue: vi
    .fn()
    .mockImplementation(
      () => new Promise((resolve) => resolve({ data: { body: "body" } })),
    ),
  addCommentToIssue: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve({}))),
}));
vi.mock("../github/issue", () => mockedIssue);

describe("checkAndCommit", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  test("checkAndCommit calls", async () => {
    const issue =
      issueCommentCreatedPRCommandFixBuildErrorPayload.issue as Issue;
    const repository = {
      owner: { login: "test-login" },
      name: "test-repo",
    } as Repository;

    await checkAndCommit({
      repository,
      token: "token",
      rootPath: "/rootpath",
      branch: "jacob-issue-48-test",
      issue,
      commitMessage: "test-commit-message",
      existingPr: {
        number: 48,
        node_id: "PR_nodeid",
        title: "pr-title",
        html_url: "https://github.com/pr-url",
      } as PullRequest,
    });

    expect(mockedCheck.runBuildCheck).toHaveBeenCalledTimes(1);
    expect(mockedCheck.runBuildCheck).toHaveBeenLastCalledWith(
      "/rootpath",
      true,
      undefined,
    );

    expect(mockedCommit.addCommitAndPush).toHaveBeenCalledTimes(1);
    expect(mockedCommit.addCommitAndPush).toHaveBeenLastCalledWith(
      "/rootpath",
      "jacob-issue-48-test",
      "test-commit-message",
    );

    expect(mockedPR.markPRReadyForReview).toHaveBeenCalledTimes(1);
    expect(mockedPR.markPRReadyForReview).toHaveBeenLastCalledWith(
      "token",
      "PR_nodeid",
    );

    expect(mockedPR.createPR).not.toHaveBeenCalled();

    expect(mockedIssue.getIssue).not.toHaveBeenCalled();
    expect(mockedIssue.addCommentToIssue).toHaveBeenCalledTimes(2);
    expect(mockedIssue.addCommentToIssue).toHaveBeenNthCalledWith(
      1,
      repository,
      48,
      "token",
      "Hello human! 👋\n\n" +
        "This PR was updated by JACoB\n\n" +
        "## Next Steps\n\n" +
        "1. Please review the PR carefully. Auto-generated code can and will contain subtle bugs and mistakes.\n\n" +
        "2. If you identify code that needs to be changed, please reject the PR with a specific reason.\n" +
        "Be as detailed as possible in your comments. JACoB will take these comments, make changes to the code and push up changes.\n" +
        "Please note that this process will take a few minutes.\n\n" +
        "3. Once the code looks good, approve the PR and merge the code.",
    );
    expect(mockedIssue.addCommentToIssue).toHaveBeenLastCalledWith(
      repository,
      48,
      "token",
      "## Update\n\nI've completed my work on this issue and have updated this pull request: [pr-title](https://github.com/pr-url).\n\nPlease review my changes there.",
    );
  });

  test("checkAndCommit - with build error", async () => {
    const fakeBuildError = dedent`
      Command failed: npm run build --verbose
      npm verb exit 1
      npm verb code 1
    `;
    mockedCheck.runBuildCheck.mockImplementation(
      () => new Promise((_, reject) => reject(new Error(fakeBuildError))),
    );

    const issue =
      issueCommentCreatedPRCommandFixBuildErrorPayload.issue as Issue;
    const repository = {
      owner: { login: "test-login" },
      name: "test-repo",
    } as Repository;

    await checkAndCommit({
      repository,
      token: "token",
      rootPath: "/rootpath",
      branch: "jacob-issue-48-test",
      issue,
      commitMessage: "test-commit-message",
      buildErrorAttemptNumber: 1,
      existingPr: {
        number: 48,
        node_id: "PR_nodeid",
        title: "pr-title",
        html_url: "https://github.com/pr-url",
      } as PullRequest,
    });

    expect(mockedCheck.runBuildCheck).toHaveBeenCalledTimes(1);
    expect(mockedCheck.runBuildCheck).toHaveBeenLastCalledWith(
      "/rootpath",
      true,
      undefined,
    );

    expect(mockedCommit.addCommitAndPush).toHaveBeenCalledTimes(1);
    expect(mockedCommit.addCommitAndPush).toHaveBeenLastCalledWith(
      "/rootpath",
      "jacob-issue-48-test",
      "test-commit-message",
    );

    expect(mockedPR.markPRReadyForReview).not.toHaveBeenCalled();
    expect(mockedPR.createPR).not.toHaveBeenCalled();

    expect(mockedIssue.addCommentToIssue).toHaveBeenCalledTimes(2);
    expect(mockedIssue.addCommentToIssue).toHaveBeenNthCalledWith(
      1,
      repository,
      48,
      "token",
      "This PR has been updated with a new commit.\n\n" +
        "## Next Steps\n\n" +
        "I am working to resolve a build error. I will update this PR with my progress.\n" +
        "@jacob-ai-bot fix build error\n\n" +
        "## Error Message (Attempt Number 2):\n\n" +
        fakeBuildError,
    );
    expect(mockedIssue.addCommentToIssue).toHaveBeenLastCalledWith(
      repository,
      48,
      "token",
      "## Update\n\n" +
        "I've updated this pull request: [pr-title](https://github.com/pr-url).\n\n" +
        "The changes currently result in a build error, so I'll be making some additional changes before it is ready to merge.",
    );
  });

  test("checkAndCommit - build error after too many attempts", async () => {
    const fakeBuildError = dedent`
      Command failed: npm run build --verbose
      npm verb exit 1
      npm verb code 1
    `;
    mockedCheck.runBuildCheck.mockImplementation(
      () => new Promise((_, reject) => reject(new Error(fakeBuildError))),
    );

    const issue =
      issueCommentCreatedPRCommandFixBuildErrorPayload.issue as Issue;
    const repository = {
      owner: { login: "test-login" },
      name: "test-repo",
    } as Repository;

    await expect(
      checkAndCommit({
        repository,
        token: "token",
        rootPath: "/rootpath",
        branch: "jacob-issue-48-test",
        issue,
        commitMessage: "test-commit-message",
        buildErrorAttemptNumber: MAX_ATTEMPTS_TO_FIX_BUILD_ERROR - 1,
        existingPr: {
          number: 48,
          node_id: "PR_nodeid",
          title: "pr-title",
          html_url: "https://github.com/pr-url",
        } as PullRequest,
      }),
    ).rejects.toThrowError(
      `Too many attempts to fix build errors.\n\nThe latest error:\n\n${fakeBuildError}`,
    );

    expect(mockedCheck.runBuildCheck).toHaveBeenCalledTimes(1);
    expect(mockedCheck.runBuildCheck).toHaveBeenLastCalledWith(
      "/rootpath",
      true,
      undefined,
    );

    expect(mockedCommit.addCommitAndPush).toHaveBeenCalledTimes(1);
    expect(mockedCommit.addCommitAndPush).toHaveBeenLastCalledWith(
      "/rootpath",
      "jacob-issue-48-test",
      "test-commit-message",
    );

    expect(mockedPR.markPRReadyForReview).not.toHaveBeenCalled();
    expect(mockedPR.createPR).not.toHaveBeenCalled();

    expect(mockedIssue.addCommentToIssue).not.toHaveBeenCalled();
  });

  test("checkAndCommit - with branch name that wasn't generated by jacob", async () => {
    const repository = {
      owner: { login: "test-login" },
      name: "test-repo",
    } as Repository;

    await checkAndCommit({
      repository,
      token: "token",
      rootPath: "/rootpath",
      branch: "random-branch-name",
      commitMessage: "test-commit-message",
      existingPr: {
        number: 48,
        node_id: "PR_nodeid",
        title: "pr-title",
        html_url: "https://github.com/pr-url",
      } as PullRequest,
    });

    expect(mockedCheck.runBuildCheck).toHaveBeenCalledTimes(1);
    expect(mockedCheck.runBuildCheck).toHaveBeenLastCalledWith(
      "/rootpath",
      true,
      undefined,
    );

    expect(mockedCommit.addCommitAndPush).toHaveBeenCalledTimes(1);
    expect(mockedCommit.addCommitAndPush).toHaveBeenLastCalledWith(
      "/rootpath",
      "random-branch-name",
      "test-commit-message",
    );

    expect(mockedPR.markPRReadyForReview).not.toHaveBeenCalled();
    expect(mockedPR.createPR).not.toHaveBeenCalled();

    // Since we don't have an jacob-created branch name, we can't
    // determine the associated issue number, so won't call getIssue()
    expect(mockedIssue.getIssue).not.toHaveBeenCalled();
    // Since we don't know the associated issue, addCommentToIssue() will
    // only be called once: on the PR, but not on the associated issue.
    expect(mockedIssue.addCommentToIssue).toHaveBeenCalledOnce();
  });
});
