import {
  describe,
  test,
  expect,
  afterEach,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import { Issue, Repository } from "@octokit/webhooks-types";

import issueCommentCreatedPRCommandFixErrorPayload from "../../data/test/webhooks/issue_comment.created.prCommand.fixError.json";
import { fixError, type PullRequest } from "./fixError";

const mockedCheckAndCommit = vi.hoisted(() => ({
  checkAndCommit: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(undefined))),
}));
vi.mock("./checkAndCommit", () => mockedCheckAndCommit);

const mockedPR = vi.hoisted(() => ({
  concatenatePRFiles: vi
    .fn()
    .mockResolvedValue({ code: "__FILEPATH__file.txt__code-with-error" }),
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
  reconstructFiles: vi.fn().mockImplementation(() => undefined),
}));
vi.mock("../utils/files", () => mockedFiles);

const mockedRequest = vi.hoisted(() => ({
  sendGptRequest: vi
    .fn()
    .mockImplementation(
      () =>
        new Promise((resolve) =>
          resolve("__FILEPATH__file.txt__fixed-file-content"),
        ),
    ),
}));
vi.mock("../openai/request", () => mockedRequest);

const mockedAssessBuildError = vi.hoisted(() => ({
  assessBuildError: vi.fn().mockImplementation(
    () =>
      new Promise((resolve) =>
        resolve({
          fileName: "file.txt",
          causeOfErrors: "something went wrong",
          ideasForFixingError: "change something",
          suggestedFixes: "change some code",
          filesToUpdate: ["src/file.txt"],
        }),
      ),
  ),
}));
vi.mock("./assessBuildError", () => mockedAssessBuildError);

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
    const issue = issueCommentCreatedPRCommandFixErrorPayload.issue as Issue;

    await fixError(
      { owner: { login: "test-login" }, name: "test-repo" } as Repository,
      "token",
      issue,
      "## Error Message (Attempt Number 2):\n\nbuild-error-info\n\n## Something else",
      "/rootpath",
      "jacob-issue-48-test",
      undefined,
      { number: 48 } as PullRequest,
    );

    expect(mockedAssessBuildError.assessBuildError).toHaveBeenCalledTimes(1);
    expect(mockedAssessBuildError.assessBuildError).toHaveBeenLastCalledWith({
      errors: "build-error-info\n\n",
      sourceMap: "source map",
    });

    expect(mockedPR.concatenatePRFiles).toHaveBeenCalledTimes(1);
    expect(mockedPR.concatenatePRFiles).toHaveBeenLastCalledWith(
      "/rootpath",
      { name: "test-repo", owner: { login: "test-login" } },
      "token",
      48,
      ["src/file.txt"],
      undefined,
    );

    expect(mockedRequest.sendGptRequest).toHaveBeenCalledTimes(1);
    const systemPrompt = mockedRequest.sendGptRequest.mock.calls[0][1];
    expect(systemPrompt).toContain("-- Types\ntypes\n");
    expect(systemPrompt).toContain(
      "-- Source Map (this is a map of the codebase, you can use it to find the correct files/functions to import. It is NOT part of the task!)\nsource map\n-- END Source Map\n",
    );
    expect(systemPrompt).toContain(
      "-- Cause Of Error\nsomething went wrong\n\n-- Ideas For Fixing Error\nchange something\n\n-- Suggested Fix\nchange some code\n",
    );
    expect(systemPrompt).toContain(
      '-- Instructions\nThe code that needs to be updated is a file called "code.txt":\n\n__FILEPATH__file.txt__code-with-error\n',
    );

    expect(mockedFiles.reconstructFiles).toHaveBeenCalledTimes(1);
    expect(mockedFiles.reconstructFiles).toHaveBeenLastCalledWith(
      "__FILEPATH__file.txt__fixed-file-content",
      "/rootpath",
    );

    expect(mockedCheckAndCommit.checkAndCommit).toHaveBeenCalledTimes(1);
    const checkAndCommitOptions =
      mockedCheckAndCommit.checkAndCommit.mock.calls[0][0];
    expect(checkAndCommitOptions.commitMessage).toBe(
      "JACoB fix error: change some code",
    );
    expect(checkAndCommitOptions.buildErrorAttemptNumber).toBe(2);
  });
});
