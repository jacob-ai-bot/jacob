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

import { codeReview, type PullRequest } from "./codeReview";

const mockedPR = vi.hoisted(() => ({
  concatenatePRFiles: vi.fn().mockResolvedValue({
    code: "__FILEPATH__file.js__\ncode-to-be-reviewed",
    lineLengthMap: { "file.js": 1 },
  }),
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
  sendGptRequest: vi
    .fn()
    .mockResolvedValue("__FILEPATH__file.js__\ncode-to-be-reviewed"),
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

    expect(mockedRequest.sendGptRequest).toHaveBeenCalledTimes(1);
    const systemPrompt = mockedRequest.sendGptRequest.mock.calls[0][1];
    expect(systemPrompt).toContain("-- Types\ntypes\n");
    expect(systemPrompt).toContain(
      "-- Source Map (this is a map of the codebase, you can use it to find the correct files/functions to import. It is NOT part of the task!)\nsource map\n-- END Source Map\n",
    );
    expect(systemPrompt).toContain("-- Types\ntypes\n\n");
    expect(systemPrompt).toContain("-- Images\nimages\n\n");
    expect(systemPrompt).toContain(dedent`
      -- Instructions:
      The code that needs to be reviewed is a file called "code.txt":
      
      -- Code to review:
      __FILEPATH__file.js__
      code-to-be-reviewed

    `);
    expect(systemPrompt).toContain(
      "Your job is to review a GitHub issue and the code written to address the issue.",
    );
    const userPrompt = mockedRequest.sendGptRequest.mock.calls[0][0];
    expect(userPrompt).toContain("-- GitHub Issue:\nissue-body\n\n");

    expect(mockedPR.createPRReview).toHaveBeenCalledTimes(1);
    expect(mockedPR.createPRReview).toHaveBeenCalledWith({
      repository: { owner: { login: "test-login" }, name: "test-repo" },
      token: "token",
      pull_number: 48,
      commit_id: "abcdefg",
      event: "APPROVE",
      body: "I have performed a code review on this PR and found no issues. Looks good!",
    });
  });

  test("codeReview succeeds with a code review that requests changes", async () => {
    mockedRequest.sendGptRequest.mockResolvedValueOnce(dedent`
      __FILEPATH__file.js__
      code-with-comments
      __COMMENT_START__
      You should improve this line of code
      __COMMENT_END__
    `);

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
    expect(mockedRequest.sendGptRequest).toHaveBeenCalledTimes(1);
    expect(mockedPR.createPRReview).toHaveBeenCalledTimes(1);
    expect(mockedPR.createPRReview).toHaveBeenCalledWith({
      repository: { owner: { login: "test-login" }, name: "test-repo" },
      token: "token",
      pull_number: 48,
      commit_id: "abcdefg",
      event: "REQUEST_CHANGES",
      comments: [
        {
          path: "file.js",
          line: 1,
          body: "You should improve this line of code",
          side: "RIGHT",
        },
      ],
      body: "I have performed a code review on this PR and I've added some comments.\n",
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
    expect(mockedRequest.sendGptRequest).toHaveBeenCalledTimes(1);
    const systemPrompt = mockedRequest.sendGptRequest.mock.calls[0][1];
    expect(systemPrompt).not.toContain(
      "Your job is to review a GitHub issue and the code written to address the issue.",
    );
    const userPrompt = mockedRequest.sendGptRequest.mock.calls[0][0];
    expect(userPrompt).not.toContain("-- GitHub Issue:");
    expect(userPrompt).not.toContain("issue-body");

    expect(mockedPR.createPRReview).toHaveBeenCalledTimes(1);
    expect(mockedPR.createPRReview).toHaveBeenCalledWith({
      repository: { owner: { login: "test-login" }, name: "test-repo" },
      token: "token",
      pull_number: 48,
      commit_id: "abcdefg",
      event: "APPROVE",
      body: "I have performed a code review on this PR and found no issues. Looks good!",
    });
  });
});
