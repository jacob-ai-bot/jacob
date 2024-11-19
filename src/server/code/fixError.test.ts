import {
  describe,
  test,
  expect,
  afterEach,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import { type Issue, type Repository } from "@octokit/webhooks-types";

import issueCommentCreatedPRCommandFixErrorPayload from "../../data/test/webhooks/issue_comment.created.prCommand.fixError.json";
import { fixError, type PullRequest } from "./fixError";
import { type CheckAndCommitOptions } from "./checkAndCommit";

const mockedCheckAndCommit = vi.hoisted(() => ({
  checkAndCommit: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(undefined))),
}));
vi.mock("./checkAndCommit", () => mockedCheckAndCommit);

const mockedPR = vi.hoisted(() => ({
  concatenatePRFiles: vi.fn().mockResolvedValue({
    code: "__FILEPATH__file.txt__\ncode-with-error",
    lineLengthMap: { "file.txt": 1 },
  }),
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

const mockedSourceMap = vi.hoisted(() => ({
  getSourceMap: vi.fn().mockImplementation(() => "source map"),
  getTypes: vi.fn().mockImplementation(() => "types"),
  getImages: vi.fn().mockImplementation(() => "images"),
}));
vi.mock("../analyze/sourceMap", () => mockedSourceMap);

const mockedFiles = vi.hoisted(() => ({
  reconstructFiles: vi.fn().mockReturnValue([
    {
      fileName: "file.txt",
      filePath: "/rootpath",
      codeBlock: "fixed-file-content",
    },
  ]),
}));
vi.mock("../utils/files", () => mockedFiles);

const mockedEvents = vi.hoisted(() => ({
  emitCodeEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("~/server/utils/events", () => mockedEvents);

const mockedRequest = vi.hoisted(() => ({
  sendGptRequest: vi
    .fn()
    .mockImplementation(
      () =>
        new Promise((resolve) =>
          resolve("__FILEPATH__file.txt__fixed-file-content"),
        ),
    ),
  countTokens: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(100))),
  MAX_OUTPUT: ["model", 100],
}));
vi.mock("../openai/request", () => mockedRequest);

const mockedAssessBuildError = vi.hoisted(() => ({
  assessBuildError: vi.fn().mockImplementation(
    () =>
      new Promise((resolve) =>
        resolve({
          errors: [
            {
              filePath: "src/file.txt",
              error: "something went wrong",
              code: "change some code",
              startingLineNumber: 1,
              endingLineNumber: 5,
            },
          ],
          filesToUpdate: ["src/file.txt"],
          needsNpmInstall: false,
          npmPackageToInstall: null,
        }),
      ),
  ),
}));
vi.mock("./assessBuildError", () => mockedAssessBuildError);

const mockedPlan = vi.hoisted(() => ({
  generateBugfixPlan: vi.fn().mockResolvedValue({
    steps: [
      {
        type: "EditExistingCode",
        title: "Fix error in file.txt",
        instructions: "Update code to fix the error",
        filePath: "src/file.txt",
        exitCriteria: "Error should be resolved",
      },
    ],
  }),
}));
vi.mock("../utils/plan", () => mockedPlan);

const originalPromptsFolder = process.env.PROMPT_FOLDER ?? "src/server/prompts";

describe("fixError", () => {
  beforeEach(() => {
    process.env.PROMPT_FOLDER = originalPromptsFolder;
  });

  afterEach(() => {
    delete process.env.PROMPT_FOLDER;
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  test("fixError calls", async () => {
    const prIssue = issueCommentCreatedPRCommandFixErrorPayload.issue as Issue;
    const mockEventData = {
      projectId: 1,
      repoFullName: "test-login/test-repo",
      userId: "test-user",
    };

    await fixError({
      ...mockEventData,
      repository: {
        owner: { login: "test-login" },
        name: "test-repo",
      } as Repository,
      token: "token",
      prIssue,
      body: "## Error Message (Attempt Number 2):\n```\nbuild-error-info\n\n```\n## Something else\n\n",
      rootPath: "/rootpath",
      branch: "jacob-issue-48-test",
      existingPr: { number: 48 } as PullRequest,
    });

    expect(mockedAssessBuildError.assessBuildError).toHaveBeenCalledTimes(1);
    expect(mockedAssessBuildError.assessBuildError).toHaveBeenLastCalledWith({
      ...mockEventData,
      errors: "build-error-info\n\n",
      sourceMap: "source map",
    });

    expect(mockedPlan.generateBugfixPlan).toHaveBeenCalledTimes(1);
    expect(mockedPlan.generateBugfixPlan).toHaveBeenCalledWith({
      projectId: mockEventData.projectId,
      errors: "build-error-info\n\n",
      sourceMap: "source map",
      types: "types",
      images: "images",
      filesToUpdate: ["src/file.txt"],
    });

    expect(mockedPR.concatenatePRFiles).toHaveBeenCalledTimes(1);
    expect(mockedPR.concatenatePRFiles).toHaveBeenLastCalledWith(
      "/rootpath",
      { name: "test-repo", owner: { login: "test-login" } },
      "token",
      48,
      undefined,
      ["src/file.txt"],
    );

    expect(mockedRequest.sendGptRequest).toHaveBeenCalledTimes(2);
    expect(mockedRequest.countTokens).toHaveBeenCalledTimes(1);

    expect(mockedFiles.reconstructFiles).toHaveBeenCalledTimes(1);
    expect(mockedFiles.reconstructFiles).toHaveBeenLastCalledWith(
      "__FILEPATH__file.txt__fixed-file-content",
      "/rootpath",
    );

    expect(mockedEvents.emitCodeEvent).toHaveBeenCalledTimes(1);
    expect(mockedEvents.emitCodeEvent).toHaveBeenLastCalledWith({
      ...mockEventData,
      codeBlock: "fixed-file-content",
      fileName: "file.txt",
      filePath: "/rootpath",
    });

    expect(mockedCheckAndCommit.checkAndCommit).toHaveBeenCalledTimes(1);
    const checkAndCommitCalls = mockedCheckAndCommit.checkAndCommit.mock.calls;
    const checkAndCommitOptions =
      checkAndCommitCalls[0]![0] as CheckAndCommitOptions;
    expect(checkAndCommitOptions.commitMessage).toBe(
      "JACoB fix error: something went wrong",
    );
    expect(checkAndCommitOptions.buildErrorAttemptNumber).toBe(2);
  });

  test("fixError handles lengthy plans", async () => {
    const prIssue = issueCommentCreatedPRCommandFixErrorPayload.issue as Issue;
    const mockEventData = {
      projectId: 1,
      repoFullName: "test-login/test-repo",
      userId: "test-user",
    };

    mockedRequest.countTokens.mockResolvedValueOnce(90000);

    await fixError({
      ...mockEventData,
      repository: {
        owner: { login: "test-login" },
        name: "test-repo",
      } as Repository,
      token: "token",
      prIssue,
      body: "## Error Message (Attempt Number 2):\n```\nbuild-error-info\n\n```\n## Something else\n\n",
      rootPath: "/rootpath",
      branch: "jacob-issue-48-test",
      existingPr: { number: 48 } as PullRequest,
    });

    expect(mockedRequest.sendGptRequest).toHaveBeenCalledTimes(3);
    expect(mockedRequest.countTokens).toHaveBeenCalledTimes(1);
  });
});
