import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import { setupServer, type SetupServer } from "msw/node";
import { HttpResponse, http } from "msw";
import "dotenv/config";

import issuesOpenedNewFilePayload from "../../data/test/webhooks/issues.opened.newFile.json";
import issuesOpenedEditFilesPayload from "../../data/test/webhooks/issues.opened.editFiles.json";
import pullRequestReviewSubmittedPayload from "../../data/test/webhooks/pull_request_review.submitted.json";
import issueCommentCreatedPRCommandCodeReviewPayload from "../../data/test/webhooks/issue_comment.created.prCommand.codeReview.json";
import issueCommentCreatedPRCommandCreateStoryPayload from "../../data/test/webhooks/issue_comment.created.prCommand.createStory.json";
import issueCommentCreatedPRCommandFixBuildErrorPayload from "../../data/test/webhooks/issue_comment.created.prCommand.fixBuildError.json";
import issueCommentCreatedIssueComandBuildPayload from "../../data/test/webhooks/issue_comment.created.issueCommand.build.json";
import installationRepositoriesAddedPayload from "../../data/test/webhooks/installation_repositories.added.json";
import {
  onGitHubEvent,
  type WebhookIssueOpenedEvent,
  type WebhookPRCommentCreatedEvent,
  type WebhookPullRequestReviewWithCommentsSubmittedEvent,
  type WebhookInstallationRepositoriesAddedEvent,
  WebhookIssueCommentCreatedEvent,
} from "./queue";

const mockedOctokitAuthApp = vi.hoisted(() => ({
  createAppAuth: vi
    .fn()
    .mockImplementation(() =>
      vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => resolve({ token: "fake-token" })),
        ),
    ),
}));
vi.mock("@octokit/auth-app", () => mockedOctokitAuthApp);

const mockedDb = vi.hoisted(() => ({
  db: {
    projects: {
      create: vi.fn().mockImplementation(() => ({
        onConflict: vi.fn().mockImplementation(() => ({
          merge: vi
            .fn()
            .mockImplementation(
              () => new Promise((resolve) => resolve({ id: 777 })),
            ),
        })),
      })),
    },
  },
}));
vi.mock("../db/db", () => mockedDb);

const mockedClone = vi.hoisted(() => ({
  cloneRepo: vi
    .fn()
    .mockImplementation(
      () =>
        new Promise((resolve) =>
          resolve({ path: "/tmp/jacob/1", cleanup: vi.fn() }),
        ),
    ),
}));
vi.mock("../git/clone", () => mockedClone);

const mockedCheck = vi.hoisted(() => ({
  runBuildCheck: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(undefined))),
}));
vi.mock("../build/node/check", () => mockedCheck);

const mockedNewFile = vi.hoisted(() => ({
  createNewFile: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(undefined))),
}));
vi.mock("../code/newFile", () => mockedNewFile);

const mockedEditFiles = vi.hoisted(() => ({
  editFiles: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(undefined))),
}));
vi.mock("../code/editFiles", () => mockedEditFiles);

const mockedCodeReview = vi.hoisted(() => ({
  codeReview: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(undefined))),
}));
vi.mock("../code/codeReview", () => mockedCodeReview);

const mockedCreateStory = vi.hoisted(() => ({
  createStory: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(undefined))),
}));
vi.mock("../code/createStory", () => mockedCreateStory);

const mockedFixBuildError = vi.hoisted(() => ({
  fixBuildError: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(undefined))),
}));
vi.mock("../code/fixBuildError", () => mockedFixBuildError);

const mockedRespondToCodeReview = vi.hoisted(() => ({
  respondToCodeReview: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(undefined))),
}));
vi.mock("../code/respondToCodeReview", () => mockedRespondToCodeReview);

const mockedComments = vi.hoisted(() => ({
  addStartingWorkComment: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(undefined))),
  addFailedWorkComment: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(undefined))),
}));
vi.mock("../github/comments", () => mockedComments);

const mockedIssue = vi.hoisted(() => ({
  addCommentToIssue: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(undefined))),
  createRepoInstalledIssue: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(undefined))),
}));
vi.mock("../github/issue", () => mockedIssue);

const mockedPR = vi.hoisted(() => ({
  getPR: vi
    .fn()
    .mockImplementation(
      () =>
        new Promise((resolve) =>
          resolve({ data: { head: { ref: "test-branch" } } }),
        ),
    ),
}));
vi.mock("../github/pr", () => mockedPR);

describe("onGitHubEvent", () => {
  let server: SetupServer | undefined;

  beforeAll(() => {
    server = setupServer(
      http.post(
        "https://api.github.com/app/installations/42293588/access_tokens",
        () => HttpResponse.json({}),
      ),
    );
    server.listen({ onUnhandledRequest: "error" });
  });

  beforeEach(() => {
    server?.resetHandlers();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    server?.close();
    vi.restoreAllMocks();
  });

  test("issue opened - new file", async () => {
    await onGitHubEvent({
      id: "1",
      name: "issues",
      payload: issuesOpenedNewFilePayload,
    } as WebhookIssueOpenedEvent);

    expect(mockedComments.addStartingWorkComment).toHaveBeenCalledTimes(1);
    expect(mockedClone.cloneRepo).toHaveBeenCalledTimes(1);
    expect(mockedCheck.runBuildCheck).toHaveBeenCalledTimes(1);
    expect(mockedCheck.runBuildCheck).toHaveBeenLastCalledWith(
      "/tmp/jacob/1",
      false,
      undefined,
    );
    expect(mockedNewFile.createNewFile).toHaveBeenCalledTimes(1);
  });

  test("issue opened - when clone repo fails", async () => {
    mockedClone.cloneRepo.mockImplementationOnce(
      () => new Promise((_, reject) => reject(new Error("test error"))),
    );

    await onGitHubEvent({
      id: "1",
      name: "issues",
      payload: issuesOpenedNewFilePayload,
    } as WebhookIssueOpenedEvent);

    expect(mockedComments.addStartingWorkComment).toHaveBeenCalledTimes(1);
    expect(mockedClone.cloneRepo).toHaveBeenCalledTimes(1);
    expect(mockedComments.addFailedWorkComment).toHaveBeenCalledTimes(1);
    expect(mockedComments.addFailedWorkComment.mock.calls[0][1]).toBe(47);
    expect(mockedComments.addFailedWorkComment.mock.calls[0][2]).toBe(
      "fake-token",
    );
    expect(
      mockedComments.addFailedWorkComment.mock.calls[0][3].toString(),
    ).toBe("Error: test error");

    expect(mockedCheck.runBuildCheck).not.toHaveBeenCalled();
    expect(mockedNewFile.createNewFile).not.toHaveBeenCalled();
  });

  test("issue opened - edit files", async () => {
    await onGitHubEvent({
      id: "2",
      name: "issues",
      payload: issuesOpenedEditFilesPayload,
    } as WebhookIssueOpenedEvent);

    expect(mockedComments.addStartingWorkComment).toHaveBeenCalledTimes(1);
    expect(mockedClone.cloneRepo).toHaveBeenCalledTimes(1);
    expect(mockedCheck.runBuildCheck).toHaveBeenCalledTimes(1);
    expect(mockedCheck.runBuildCheck).toHaveBeenLastCalledWith(
      "/tmp/jacob/1",
      false,
      undefined,
    );
    expect(mockedEditFiles.editFiles).toHaveBeenCalledTimes(1);
  });

  test("PR comment created - code review command", async () => {
    await onGitHubEvent({
      id: "3",
      name: "issue_comment",
      payload: issueCommentCreatedPRCommandCodeReviewPayload,
    } as WebhookPRCommentCreatedEvent);

    expect(mockedComments.addStartingWorkComment).toHaveBeenCalledTimes(1);
    expect(mockedClone.cloneRepo).toHaveBeenCalledTimes(1);
    expect(mockedCodeReview.codeReview).toHaveBeenCalledTimes(1);
  });

  test("PR comment created - create story command", async () => {
    await onGitHubEvent({
      id: "4",
      name: "issue_comment",
      payload: issueCommentCreatedPRCommandCreateStoryPayload,
    } as WebhookPRCommentCreatedEvent);

    expect(mockedComments.addStartingWorkComment).toHaveBeenCalledTimes(1);
    expect(mockedClone.cloneRepo).toHaveBeenCalledTimes(1);
    expect(mockedCreateStory.createStory).toHaveBeenCalledTimes(1);
  });

  test("PR comment created - fix build error command", async () => {
    await onGitHubEvent({
      id: "5",
      name: "issue_comment",
      payload: issueCommentCreatedPRCommandFixBuildErrorPayload,
    } as WebhookPRCommentCreatedEvent);

    expect(mockedComments.addStartingWorkComment).toHaveBeenCalledTimes(1);
    expect(mockedClone.cloneRepo).toHaveBeenCalledTimes(1);
    expect(mockedFixBuildError.fixBuildError).toHaveBeenCalledTimes(1);
  });

  test("PR review submitted", async () => {
    await onGitHubEvent({
      id: "6",
      name: "pull_request_review",
      payload: pullRequestReviewSubmittedPayload,
    } as WebhookPullRequestReviewWithCommentsSubmittedEvent);

    expect(mockedClone.cloneRepo).toHaveBeenCalledTimes(1);
    expect(mockedRespondToCodeReview.respondToCodeReview).toHaveBeenCalledTimes(
      1,
    );
  });

  test("repo added - one repo", async () => {
    await onGitHubEvent({
      id: "7",
      name: "installation_repositories",
      payload: installationRepositoriesAddedPayload,
    } as unknown as WebhookInstallationRepositoriesAddedEvent);

    expect(mockedClone.cloneRepo).toHaveBeenCalledTimes(1);
    expect(mockedCheck.runBuildCheck).toHaveBeenCalledTimes(1);
    expect(mockedCheck.runBuildCheck).toHaveBeenLastCalledWith(
      "/tmp/jacob/1",
      false,
      undefined,
    );
    expect(mockedIssue.createRepoInstalledIssue).toHaveBeenCalledTimes(1);
  });

  test("issue command - build", async () => {
    await onGitHubEvent({
      id: "8",
      name: "issue_comment",
      payload: issueCommentCreatedIssueComandBuildPayload,
    } as WebhookIssueCommentCreatedEvent);

    expect(mockedClone.cloneRepo).toHaveBeenCalledTimes(1);
    expect(mockedCheck.runBuildCheck).toHaveBeenCalledTimes(1);
    expect(mockedCheck.runBuildCheck).toHaveBeenLastCalledWith(
      "/tmp/jacob/1",
      false,
      undefined,
    );
    expect(mockedIssue.addCommentToIssue).toHaveBeenCalledTimes(1);
  });

  test("issue command - build - handles build failure", async () => {
    mockedCheck.runBuildCheck.mockImplementationOnce(
      () => new Promise((_, reject) => reject(new Error("build error"))),
    );

    await onGitHubEvent({
      id: "8",
      name: "issue_comment",
      payload: issueCommentCreatedIssueComandBuildPayload,
    } as WebhookIssueCommentCreatedEvent);

    expect(mockedClone.cloneRepo).toHaveBeenCalledTimes(1);
    expect(mockedCheck.runBuildCheck).toHaveBeenCalledTimes(1);
    expect(mockedCheck.runBuildCheck).toHaveBeenLastCalledWith(
      "/tmp/jacob/1",
      false,
      undefined,
    );
    expect(mockedIssue.addCommentToIssue).not.toHaveBeenCalled();
    expect(mockedComments.addFailedWorkComment).toHaveBeenCalledTimes(1);
    expect(mockedComments.addFailedWorkComment.mock.calls[0][1]).toBe(125);
    expect(mockedComments.addFailedWorkComment.mock.calls[0][2]).toBe(
      "fake-token",
    );
    expect(
      mockedComments.addFailedWorkComment.mock.calls[0][3].toString(),
    ).toBe("Error: build error");
  });
});
