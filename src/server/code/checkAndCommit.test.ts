import { describe, test, expect, afterEach, afterAll, vi } from "vitest";
import { Issue, Repository } from "@octokit/webhooks-types";

import issueCommentCreatedPRCommandFixBuildErrorPayload from "../../data/test/webhooks/issue_comment.created.prCommand.fixBuildError.json";
import { checkAndCommit, type PullRequest } from "./checkAndCommit";

const mockedDynamicImport = vi.hoisted(() => ({
  dynamicImport: vi
    .fn()
    .mockImplementation(async (specifier) => await import(specifier)),
}));
vi.mock("../utils/dynamicImport", () => mockedDynamicImport);

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
      branch: "otto-issue-48-test",
      issue,
      commitMessage: "test-commit-message",
      existingPr: {
        number: 48,
        node_id: "PR_nodeid",
        title: "pr-title",
        html_url: "https://github.com/pr-url",
      } as PullRequest,
    });

    expect(vi.mocked(mockedCheck.runBuildCheck)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(mockedCheck.runBuildCheck)).toHaveBeenLastCalledWith(
      "/rootpath",
    );

    expect(vi.mocked(mockedCommit.addCommitAndPush)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(mockedCommit.addCommitAndPush)).toHaveBeenLastCalledWith(
      "/rootpath",
      "otto-issue-48-test",
      "test-commit-message",
    );

    expect(vi.mocked(mockedPR.markPRReadyForReview)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(mockedPR.markPRReadyForReview)).toHaveBeenLastCalledWith(
      "token",
      "PR_nodeid",
    );

    expect(vi.mocked(mockedIssue.addCommentToIssue)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(mockedIssue.addCommentToIssue)).toHaveBeenNthCalledWith(
      1,
      repository,
      48,
      "token",
      "Hello human! 👋\n\n" +
        "This PR was updated by Otto\n\n" +
        "## Next Steps\n\n" +
        "1. Please review the PR carefully. Auto-generated code can and will contain subtle bugs and mistakes.\n\n" +
        "2. If you identify code that needs to be changed, please reject the PR with a specific reason.\n" +
        "Be as detailed as possible in your comments. Otto will take these comments, make changes to the code and push up changes.\n" +
        "Please note that this process will take a few minutes.\n\n" +
        "3. Once the code looks good, approve the PR and merge the code.",
    );
    expect(vi.mocked(mockedIssue.addCommentToIssue)).toHaveBeenLastCalledWith(
      repository,
      48,
      "token",
      "## Update\n\nI've completed my work on this issue and have updated this pull request: [pr-title](https://github.com/pr-url).\n\nPlease review my changes there.",
    );
  });
});
