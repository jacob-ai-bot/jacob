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
  MAX_ATTEMPTS_TO_FIX_BUILD_ERROR: 1,
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

const mockedBugfix = vi.hoisted(() => ({
  getBuildErrors: vi.fn().mockResolvedValue([
    {
      filePath: "src/index.ts",
      lineNumber: 10,
      errorType: "SyntaxError",
      errorMessage: "Unexpected token 'const'",
    },
  ]),
  assessAndInstallNpmPackages: vi.fn().mockResolvedValue(false),
}));
vi.mock("../agent/bugfix", () => mockedBugfix);

const mockedRequest = vi.hoisted(() => ({
  sendGptRequest: vi
    .fn()
    .mockImplementation(
      () =>
        new Promise((resolve) =>
          resolve("__FILEPATH__file.txt__fixed-file-content"),
        ),
    ),
  sendGptRequestWithSchema: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(""))),
  sendSelfConsistencyChainOfThoughtGptRequest: vi
    .fn()
    .mockImplementation(
      () =>
        new Promise((resolve) =>
          resolve(
            "<code_patch>--- file.txt\n+++ file.txt\n@@ -1 +1 @@\n- code-with-error\n+ fixed-code</code_patch>",
          ),
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

const mockedDb = vi.hoisted(() => ({
  research: {
    where: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue([
      {
        question: "Question",
        answer: "Answer",
        todoId: "mocked-todo-id",
      },
    ]),
  },
  todos: {
    findByOptional: vi.fn().mockResolvedValue({ id: "mocked-todo-id" }),
    update: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock("~/server/db/db", () => ({ db: mockedDb }));

const mockedTodos = vi.hoisted(() => ({
  getOrCreateTodo: vi.fn().mockResolvedValue({ id: "mocked-todo-id" }),
}));
vi.mock("../utils/todos", () => mockedTodos);

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
        full_name: "test-login/test-repo",
      } as Repository,
      token: "token",
      prIssue,
      body: "## Error Message:\n```\nbuild-error-info\n\n```\n## Something else\n\n",
      rootPath: "/rootpath",
      branch: "jacob-issue-48-test",
      existingPr: { number: 48 } as PullRequest,
    });

    expect(mockedPlan.generateBugfixPlan).toHaveBeenCalledTimes(1);
    expect(mockedPlan.generateBugfixPlan).toHaveBeenCalledWith({
      code: "__FILEPATH__file.txt__\ncode-with-error",
      errors: [
        "Error in src/index.ts: line(10): SyntaxError - Unexpected token 'const' ",
      ],
      githubIssue: "body",
      rootPath: "/rootpath",
    });

    expect(mockedPR.concatenatePRFiles).toHaveBeenCalledTimes(1);
    expect(mockedPR.concatenatePRFiles).toHaveBeenLastCalledWith(
      "/rootpath",
      {
        full_name: "test-login/test-repo",
        name: "test-repo",
        owner: { login: "test-login" },
      },
      "token",
      48,
      undefined,
      ["src/index.ts"],
    );

    expect(mockedRequest.sendGptRequestWithSchema).toHaveBeenCalledTimes(1);
    expect(
      mockedRequest.sendSelfConsistencyChainOfThoughtGptRequest,
    ).toHaveBeenCalledTimes(1);
    expect(mockedRequest.countTokens).toHaveBeenCalledTimes(1);

    expect(mockedFiles.reconstructFiles).not.toHaveBeenCalled();
  });

  test("should handle patch-based code updates", async () => {
    const result = await fixError({
      repository: mockRepo,
      token: "token",
      rootPath: "/rootpath",
      branch: "main",
      model: "model",
      issue: { body: "body" },
      errorInfoArray: [{ filePath: "file.txt", error: "error" }],
    });

    expect(result).toBeDefined();
    expect(mockedBugfix.applyPatchesToFiles).toHaveBeenCalledWith(
      "/rootpath",
      [
        "<code_patch>--- file.txt\n+++ file.txt\n@@ -1 +1 @@\n- code-with-error\n+ fixed-code</code_patch>",
      ],
      ["file.txt"],
    );
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
        full_name: "test-login/test-repo",
      } as Repository,
      token: "token",
      prIssue,
      body: "## Error Message (Attempt Number 2):\n```\nbuild-error-info\n\n```\n## Something else\n\n",
      rootPath: "/rootpath",
      branch: "jacob-issue-48-test",
      existingPr: { number: 48 } as PullRequest,
    });

    expect(mockedRequest.sendGptRequest).toHaveBeenCalledTimes(1);
    expect(mockedRequest.countTokens).toHaveBeenCalledTimes(1);
  });
});
