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

import issueCommentCreatedPRCommandFixBuildErrorPayload from "../../data/test/webhooks/issue_comment.created.prCommand.fixBuildError.json";
import { fixBuildError, type PullRequest } from "./fixBuildError";

const mockedCheckAndCommit = vi.hoisted(() => ({
  checkAndCommit: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(undefined))),
}));
vi.mock("./checkAndCommit", () => mockedCheckAndCommit);

const mockedPR = vi.hoisted(() => ({
  concatenatePRFiles: vi
    .fn()
    .mockImplementation(
      () =>
        new Promise((resolve) =>
          resolve("__FILEPATH__file.txt__code-with-error"),
        ),
    ),
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
          causeOfError: "something went wrong",
          ideasForFixingError: "change something",
          suggestedFix: "new code",
        }),
      ),
  ),
}));
vi.mock("./assessBuildError", () => mockedAssessBuildError);

const originalPromptsFolder = process.env.PROMPT_FOLDER ?? "src/server/prompts";

describe("fixBuildError", () => {
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

  test("fixBuildError calls", async () => {
    const issue =
      issueCommentCreatedPRCommandFixBuildErrorPayload.issue as Issue;

    await fixBuildError(
      { owner: { login: "test-login" }, name: "test-repo" } as Repository,
      "token",
      issue,
      "## Error Message:\n\nbuild-error-info\n\n## Something else",
      "/rootpath",
      "otto-issue-48-test",
      { number: 48 } as PullRequest,
    );

    console.log(vi.mocked(mockedRequest.sendGptRequest).mock.calls);

    expect(
      vi.mocked(mockedAssessBuildError.assessBuildError),
    ).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(mockedAssessBuildError.assessBuildError),
    ).toHaveBeenLastCalledWith("build-error-info\n\n");

    expect(vi.mocked(mockedPR.concatenatePRFiles)).toHaveBeenCalledTimes(1);

    expect(vi.mocked(mockedRequest.sendGptRequest)).toHaveBeenCalledTimes(1);
    const systemPrompt = mockedRequest.sendGptRequest.mock.calls[0][1];
    expect(vi.mocked(systemPrompt)).toContain("-- Types\ntypes\n");
    expect(vi.mocked(systemPrompt)).toContain(
      "-- Source Map (this is a map of the codebase, you can use it to find the correct files/functions to import. It is NOT part of the task!)\nsource map\n-- END Source Map\n",
    );
    expect(vi.mocked(systemPrompt)).toContain(
      "-- Cause Of Error\nsomething went wrong\n\n-- Ideas For Fixing Error\nchange something\n\n-- Suggested Fix\nnew code\n",
    );
    expect(vi.mocked(systemPrompt)).toContain(
      '-- Instructions\nThe code that needs to be updated is a file called "code.txt":\n\n__FILEPATH__file.txt__code-with-error\n',
    );

    expect(vi.mocked(mockedFiles.reconstructFiles)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(mockedFiles.reconstructFiles)).toHaveBeenLastCalledWith(
      "__FILEPATH__file.txt__fixed-file-content",
      "/rootpath",
    );

    expect(
      vi.mocked(mockedCheckAndCommit.checkAndCommit),
    ).toHaveBeenCalledTimes(1);
  });
});
