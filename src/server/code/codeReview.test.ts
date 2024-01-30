import dedent from "ts-dedent";
import {
  describe,
  test,
  expect,
  afterEach,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import { Repository } from "@octokit/webhooks-types";

import { codeReview, type CodeReview, type PullRequest } from "./codeReview";

const mockedPR = vi.hoisted(() => ({
  concatenatePRFiles: vi
    .fn()
    .mockImplementation(
      () =>
        new Promise((resolve) =>
          resolve("__FILEPATH__file.txt__code-to-be-reviewed"),
        ),
    ),
  createPRReview: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve({}))),
}));
vi.mock("../github/pr", () => mockedPR);

const mockedIssue = vi.hoisted(() => ({
  getIssue: vi.fn().mockImplementation(
    (_r, _t, issueNumber) =>
      new Promise((resolve, reject) => {
        if (isNaN(issueNumber)) {
          reject(new Error("Issue number is not a number"));
        } else {
          resolve({ data: { body: "issue-body" } });
        }
      }),
  ),
}));
vi.mock("../github/issue", () => mockedIssue);

const mockedSourceMap = vi.hoisted(() => ({
  getSourceMap: vi.fn().mockImplementation(() => "source map"),
  getTypes: vi.fn().mockImplementation(() => "types"),
  getImages: vi.fn().mockImplementation(() => "images"),
}));
vi.mock("../analyze/sourceMap", () => mockedSourceMap);

const mockedRequest = vi.hoisted(() => ({
  sendGptRequestWithSchema: vi.fn().mockImplementation(() => {
    const codeReview: CodeReview = {
      isApproved: true,
    };
    return new Promise((resolve) => resolve(codeReview));
  }),
}));
vi.mock("../openai/request", () => mockedRequest);

const originalPromptsFolder = process.env.PROMPT_FOLDER ?? "src/server/prompts";

describe("codeReview", () => {
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

  test("codeReview succeeds with an approved code review", async () => {
    await codeReview(
      { owner: { login: "test-login" }, name: "test-repo" } as Repository,
      "token",
      "/rootpath",
      "jacob-issue-48-test",
      undefined,
      { number: 48, head: { sha: "abcdefg" } } as PullRequest,
    );

    expect(mockedIssue.getIssue).toHaveBeenCalledTimes(1);

    expect(mockedPR.concatenatePRFiles).toHaveBeenCalledTimes(1);

    expect(mockedRequest.sendGptRequestWithSchema).toHaveBeenCalledTimes(1);
    const systemPrompt =
      mockedRequest.sendGptRequestWithSchema.mock.calls[0][1];
    expect(systemPrompt).toContain("-- Types\ntypes\n");
    expect(systemPrompt).toContain(
      "-- Source Map (this is a map of the codebase, you can use it to find the correct files/functions to import. It is NOT part of the task!)\nsource map\n-- END Source Map\n",
    );
    expect(systemPrompt).toContain("-- Types\ntypes\n\n");
    expect(systemPrompt).toContain("-- Images\nimages\n\n");
    expect(systemPrompt).toContain(
      '-- Instructions:\nThe code that needs to be reviewed is a file called "code.txt":\n\n-- Code to review:\n__FILEPATH__file.txt__code-to-be-reviewed\n',
    );
    expect(systemPrompt).toContain(
      "Your job is to review a GitHub issue and the code written to address the issue.",
    );
    const userPrompt = mockedRequest.sendGptRequestWithSchema.mock.calls[0][0];
    expect(userPrompt).toContain("-- GitHub Issue:\nissue-body\n\n");
    expect(userPrompt).toContain(
      "Your job is to review a GitHub issue and the code written to address the issue.",
    );

    expect(mockedPR.createPRReview).toHaveBeenCalledTimes(1);
    expect(mockedPR.createPRReview).toHaveBeenCalledWith({
      repository: { owner: { login: "test-login" }, name: "test-repo" },
      token: "token",
      pull_number: 48,
      commit_id: "abcdefg",
      event: "COMMENT",
      body: "I have performed a code review on this PR and found no issues. Looks good!",
    });
  });

  test("codeReview succeeds with a code review that requests changes", async () => {
    mockedRequest.sendGptRequestWithSchema.mockImplementationOnce(() => {
      const codeReview: CodeReview = {
        minorIssues: "minor issues",
        majorIssues: "major issues",
        isApproved: false,
      };
      return new Promise((resolve) => resolve(codeReview));
    });

    await codeReview(
      { owner: { login: "test-login" }, name: "test-repo" } as Repository,
      "token",
      "/rootpath",
      "jacob-issue-48-test",
      undefined,
      { number: 48, head: { sha: "abcdefg" } } as PullRequest,
    );

    expect(mockedIssue.getIssue).toHaveBeenCalledTimes(1);
    expect(mockedPR.concatenatePRFiles).toHaveBeenCalledTimes(1);
    expect(mockedRequest.sendGptRequestWithSchema).toHaveBeenCalledTimes(1);
    expect(mockedPR.createPRReview).toHaveBeenCalledTimes(1);
    expect(mockedPR.createPRReview).toHaveBeenCalledWith({
      repository: { owner: { login: "test-login" }, name: "test-repo" },
      token: "token",
      pull_number: 48,
      commit_id: "abcdefg",
      event: "COMMENT",
      body: dedent`
        I have performed a code review on this PR and I've found a few issues that need to be addressed.

        Here are the main issues I found:

        major issues

        I also found a few minor issues that I'll try to address as well:

        minor issues

      `,
    });
  });

  test("codeReview still succeeds with an approved code review when branch name isn't from jacob", async () => {
    await codeReview(
      { owner: { login: "test-login" }, name: "test-repo" } as Repository,
      "token",
      "/rootpath",
      "my-human-branch-name",
      undefined,
      { number: 48, head: { sha: "abcdefg" } } as PullRequest,
    );

    expect(mockedIssue.getIssue).toHaveBeenCalledTimes(1);
    expect(mockedPR.concatenatePRFiles).toHaveBeenCalledTimes(1);
    expect(mockedRequest.sendGptRequestWithSchema).toHaveBeenCalledTimes(1);
    const systemPrompt =
      mockedRequest.sendGptRequestWithSchema.mock.calls[0][1];
    expect(systemPrompt).not.toContain(
      "Your job is to review a GitHub issue and the code written to address the issue.",
    );
    const userPrompt = mockedRequest.sendGptRequestWithSchema.mock.calls[0][0];
    expect(userPrompt).not.toContain("-- GitHub Issue:");
    expect(userPrompt).not.toContain("issue-body");
    expect(userPrompt).not.toContain(
      "Your job is to review a GitHub issue and the code written to address the issue.",
    );

    expect(mockedPR.createPRReview).toHaveBeenCalledTimes(1);
    expect(mockedPR.createPRReview).toHaveBeenCalledWith({
      repository: { owner: { login: "test-login" }, name: "test-repo" },
      token: "token",
      pull_number: 48,
      commit_id: "abcdefg",
      event: "COMMENT",
      body: "I have performed a code review on this PR and found no issues. Looks good!",
    });
  });
});
