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

    expect(mockedRequest.sendGptRequest).toHaveBeenCalledOnce();
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
    expect(mockedCheckAndCommit.checkAndCommit).toHaveBeenLastCalledWith({
      ...mockEventData,
      repository: editFilesParams.repository,
      token: editFilesParams.token,
      rootPath: editFilesParams.rootPath,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      branch: expect.stringContaining("jacob-issue-"),
      commitMessage: `JACoB PR for Issue ${issue.title}`,
      issue,
      newPrTitle: `JACoB PR for Issue ${issue.title}`,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      newPrBody: expect.stringContaining("## Plan:\n\nsteps-to-address-issue"),
      newPrReviewers: issue.assignees.map((assignee) => assignee.login),
    });
  });
});
