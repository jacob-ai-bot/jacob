/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import { type Issue, type Repository } from "@octokit/webhooks-types";

import issuesOpenedEditFilesPayload from "../../data/test/webhooks/issues.opened.editFiles.json";
import { type EditFilesParams, editFiles } from "./editFiles";

const mockedCheckAndCommit = vi.hoisted(() => ({
  checkAndCommit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./checkAndCommit", () => mockedCheckAndCommit);

const mockedEvents = vi.hoisted(() => ({
  emitCodeEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("~/server/utils/events", () => mockedEvents);

const mockedSourceMap = vi.hoisted(() => ({
  getTypes: vi.fn().mockImplementation(() => "types"),
  getImages: vi.fn().mockImplementation(() => "images"),
}));
vi.mock("../analyze/sourceMap", () => mockedSourceMap);

const mockedRequest = vi.hoisted(() => ({
  sendGptVisionRequest: vi
    .fn()
    .mockResolvedValue("__FILEPATH__file.txt__\nfixed-file-content"),
  sendGptRequestWithSchema: vi.fn().mockResolvedValue({
    stepsToAddressIssue: "steps-to-address-issue",
    issueQualityScore: 5,
    commitTitle: "commit-title",
    filesToCreate: [],
    filesToUpdate: ["file.txt"],
  }),
  sendGptRequest: vi
    .fn()
    .mockResolvedValue("__FILEPATH__file.txt__\nfixed-file-content"),
  countTokens: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(100))),
  MAX_OUTPUT: ["model", 100],
}));
vi.mock("../openai/request", () => mockedRequest);

const mockedBranch = vi.hoisted(() => ({
  setNewBranch: vi.fn().mockResolvedValue({ stdout: "", stderr: "" }),
}));
vi.mock("../git/branch", () => mockedBranch);

const mockedFiles = vi.hoisted(() => ({
  concatenateFiles: vi.fn().mockReturnValue({
    code: "concatenated-code",
    lineLengthMap: { "file.txt": 1 },
  }),
  reconstructFiles: vi.fn().mockReturnValue([
    {
      fileName: "file.txt",
      filePath: "/rootpath",
      codeBlock: "fixed-file-content",
    },
  ]),
}));
vi.mock("../utils/files", () => mockedFiles);

const originalPromptsFolder = process.env.PROMPT_FOLDER ?? "src/server/prompts";

const mockedDb = vi.hoisted(() => ({
  research: {
    where: vi.fn().mockReturnValue({
      all: vi.fn().mockResolvedValue([{ someResearchData: "mocked research" }]),
    }),
  },
  todos: {
    findByOptional: vi.fn().mockResolvedValue({ id: "mocked-todo-id" }),
  },
}));
vi.mock("~/server/db/db", () => ({ db: mockedDb }));

const mockedTodos = vi.hoisted(() => ({
  getOrCreateTodo: vi.fn().mockResolvedValue({}),
}));
vi.mock("../utils/todos", () => mockedTodos);

const mockedPlan = vi.hoisted(() => ({
  getOrGeneratePlan: vi.fn().mockResolvedValue({
    steps: [
      {
        type: "EditExistingCode",
        title: "Edit file.txt",
        instructions: "Update the content",
        filePath: "file.txt",
        exitCriteria: "File is updated",
        dependencies: null,
      },
    ],
  }),
}));
vi.mock("~/server/utils/plan", () => mockedPlan);

describe("editFiles", () => {
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

  const issue = issuesOpenedEditFilesPayload.issue as Issue;
  const mockEventData = {
    projectId: 1,
    repoFullName: "test-login/test-repo",
    userId: "test-user",
  };

  const editFilesParams: EditFilesParams = {
    ...mockEventData,
    repository: {
      owner: { login: "test-login" },
      name: "test-repo",
    } as Repository,
    token: "token",
    issue,
    rootPath: "/rootpath",
    sourceMap: "source map",
  };

  test("editFiles success path", async () => {
    await editFiles(editFilesParams);

    expect(mockedRequest.sendGptRequest).toHaveBeenCalledTimes(1);

    expect(mockedRequest.sendGptRequest.mock.calls[0]![0]).toContain(
      "Any code or suggested imports in the GitHub Issue above is example code and may contain bugs or incorrect information or approaches.",
    );
    expect(mockedRequest.sendGptRequest.mock.calls[0]![1]).toContain(
      "You are the top, most distinguished Technical Fellow at Microsoft.",
    );

    expect(mockedBranch.setNewBranch).toHaveBeenCalledOnce();
    expect(mockedBranch.setNewBranch).toHaveBeenLastCalledWith({
      ...mockEventData,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      branchName: expect.stringContaining("jacob-issue-"),
      rootPath: editFilesParams.rootPath,
    });

    expect(mockedEvents.emitCodeEvent).toHaveBeenCalledOnce();
    expect(mockedEvents.emitCodeEvent).toHaveBeenLastCalledWith({
      ...mockEventData,
      codeBlock: "fixed-file-content",
      fileName: "file.txt",
      filePath: "/rootpath",
    });

    expect(mockedCheckAndCommit.checkAndCommit).toHaveBeenCalledOnce();
    expect(mockedCheckAndCommit.checkAndCommit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        newPrBody: expect.stringContaining("## Plan:\n"),
      }),
    );

    // Verify that the research data is fetched
    expect(mockedDb.research.where).toHaveBeenCalledWith({
      issueId: issue.number,
    });

    // Because the research data is already present, we don't need to create a todo
    expect(mockedTodos.getOrCreateTodo).not.toHaveBeenCalled();
  });
});
