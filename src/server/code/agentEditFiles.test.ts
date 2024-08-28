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
import { dedent } from "ts-dedent";

import { useTestDatabase } from "~/server/utils/testHelpers";
import issuesOpenedEditFilesPayload from "../../data/test/webhooks/issues.opened.editFiles.json";
import { type EditFilesParams, editFiles } from "./agentEditFiles";

vi.mock("fs");
const mockedCheckAndCommit = vi.hoisted(() => ({
  checkAndCommit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./checkAndCommit", () => mockedCheckAndCommit);

const mockedEvents = vi.hoisted(() => ({
  emitCodeEvent: vi.fn().mockResolvedValue(undefined),
  emitPlanEvent: vi.fn().mockResolvedValue(undefined),
  emitPlanStepEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("~/server/utils/events", () => mockedEvents);

const mockedSourceMap = vi.hoisted(() => ({
  getTypes: vi.fn().mockImplementation(() => "types"),
  getImages: vi.fn().mockImplementation(() => "images"),
}));
vi.mock("../analyze/sourceMap", () => mockedSourceMap);

const mockedFiles = vi.hoisted(() => ({
  applyCodePatch: vi.fn().mockRejectedValue(new Error("invalid patch")),
  getFiles: vi.fn().mockReturnValue("File: file.txt\nfile-content\n"),
  standardizePath: vi.fn().mockReturnValue("standardizedPath"),
}));
vi.mock("../utils/files", () => mockedFiles);

const mockedTraverse = vi.hoisted(() => ({
  traverseCodebase: vi.fn().mockReturnValue([]),
}));
vi.mock("../analyze/traverse", () => mockedTraverse);

const dummyPlan = vi.hoisted(() => ({
  steps: [
    {
      type: "EditExistingCode",
      title: "Step 1",
      instructions: "Instructions",
      filePath: "file.txt",
      exitCriteria: "exit criteria",
    },
  ],
}));

const mockedPlan = vi.hoisted(() => ({
  createPlan: vi.fn().mockResolvedValue(dummyPlan),
}));
vi.mock("~/server/agent/plan", () => mockedPlan);

const mockedRequest = vi.hoisted(() => ({
  sendGptVisionRequest: vi
    .fn()
    .mockResolvedValue("<code_patch>patch</code_patch>"),
  sendGptRequest: vi.fn().mockResolvedValue("<code_patch>patch</code_patch>"),
}));
vi.mock("../openai/request", () => mockedRequest);

const mockedBranch = vi.hoisted(() => ({
  setNewBranch: vi.fn().mockResolvedValue({ stdout: "", stderr: "" }),
}));
vi.mock("../git/branch", () => mockedBranch);

const mockedCheck = vi.hoisted(() => ({
  runBuildCheck: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../build/node/check", () => mockedCheck);

const mockedCommit = vi.hoisted(() => ({
  addCommitAndPush: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../git/commit", () => mockedCommit);

const mockedPatch = vi.hoisted(() => ({
  applyCodePatchViaLLM: vi.fn().mockResolvedValue([
    {
      fileName: "file.txt",
      filePath: "/rootpath",
      codeBlock: "fixed-file-content",
    },
  ]),
}));
vi.mock("~/server/agent/patch", () => mockedPatch);

const mockedOperations = vi.hoisted(() => ({
  gitStash: vi.fn().mockResolvedValue({ stdout: "", stderr: "" }),
}));
vi.mock("~/server/git/operations", () => mockedOperations);

const mockedContext = vi.hoisted(() => ({
  getOrCreateCodebaseContext: vi.fn().mockReturnValue([
    {
      file: "file.txt",
      code: ["file-content"],
      importStatements: [],
      text: "text",
      diagram: "diagram",
      overview: "overview",
      importedFiles: [],
      exports: [
        {
          type: "type",
          name: "name",
          exportType: "exportType",
          line_no: 1,
          code_referenced: "code_referenced",
          source: "source",
        },
      ],
      referencedImportDetails: [
        {
          name: "name",
          exportType: "exportType",
          line_no: 1,
          code_referenced: "code_referenced",
          source: "source",
          overview: "overview",
        },
      ],
    },
  ]),
}));
vi.mock("../utils/codebaseContext", () => mockedContext);

const mockedParseTemplate = vi.hoisted(() => ({
  parseTemplate: vi.fn().mockReturnValue("parsedTemplate"),
  generateJacobBranchName: vi.fn().mockReturnValue("jacob-issue-1"),
}));
vi.mock("../utils/index", async () => {
  const actual = await vi.importActual("../utils/index");
  return {
    ...actual,
    ...mockedParseTemplate,
  };
});

const originalPromptsFolder = process.env.PROMPT_FOLDER ?? "src/server/prompts";

describe("editFiles", () => {
  useTestDatabase();

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

    expect(mockedPlan.createPlan).toHaveBeenCalledOnce();
    expect(mockedPlan.createPlan).toHaveBeenLastCalledWith(
      `${issue.title}\n${issue.body}`,
      "file.txt:\ntext",
      "",
      "",
      "",
    );

    expect(mockedEvents.emitPlanEvent).toHaveBeenCalledOnce();
    expect(mockedEvents.emitPlanEvent).toHaveBeenLastCalledWith({
      ...mockEventData,
      plan: dummyPlan,
    });

    expect(mockedEvents.emitPlanStepEvent).toHaveBeenCalledOnce();
    expect(mockedEvents.emitPlanStepEvent).toHaveBeenLastCalledWith({
      ...mockEventData,
      planStep: dummyPlan.steps[0],
    });

    expect(mockedFiles.getFiles).toHaveBeenCalledOnce();
    expect(mockedFiles.getFiles).toHaveBeenLastCalledWith(
      editFilesParams.rootPath,
      [dummyPlan.steps[0]?.filePath],
    );

    expect(mockedRequest.sendGptVisionRequest).toHaveBeenCalledOnce();
    expect(mockedRequest.sendGptVisionRequest.mock.calls[0]![0]).toContain(
      "parsedTemplate",
    );
    expect(mockedRequest.sendGptVisionRequest.mock.calls[0]![1]).toContain(
      "parsedTemplate",
    );
    expect(
      mockedRequest.sendGptVisionRequest.mock.calls[0]![2],
    ).toBeUndefined();
    expect(mockedRequest.sendGptVisionRequest.mock.calls[0]![3]).toBe(0.2);
    expect(mockedRequest.sendGptVisionRequest.mock.calls[0]![4]).toStrictEqual(
      mockEventData,
    );

    expect(mockedBranch.setNewBranch).toHaveBeenCalledOnce();
    expect(mockedBranch.setNewBranch).toHaveBeenLastCalledWith({
      ...mockEventData,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      branchName: expect.stringContaining("jacob-issue-"),
      rootPath: editFilesParams.rootPath,
    });

    expect(mockedFiles.applyCodePatch).toHaveBeenCalledOnce();
    expect(mockedFiles.applyCodePatch).toHaveBeenLastCalledWith(
      editFilesParams.rootPath,
      "patch",
    );

    expect(mockedOperations.gitStash).toHaveBeenCalledOnce();
    expect(mockedOperations.gitStash).toHaveBeenLastCalledWith({
      directory: editFilesParams.rootPath,
      baseEventData: mockEventData,
    });

    expect(mockedPatch.applyCodePatchViaLLM).toHaveBeenCalledOnce();
    expect(mockedPatch.applyCodePatchViaLLM).toHaveBeenLastCalledWith(
      editFilesParams.rootPath,
      dummyPlan.steps[0]?.filePath,
      "patch",
      false,
    );

    expect(mockedEvents.emitCodeEvent).toHaveBeenCalledOnce();
    expect(mockedEvents.emitCodeEvent).toHaveBeenLastCalledWith({
      ...mockEventData,
      codeBlock: "fixed-file-content",
      fileName: "file.txt",
      filePath: "/rootpath",
    });

    expect(mockedCheck.runBuildCheck).toHaveBeenCalledOnce();
    expect(mockedCheck.runBuildCheck).toHaveBeenLastCalledWith({
      ...mockEventData,
      path: editFilesParams.rootPath,
      afterModifications: true,
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
      newPrBody: dedent`
        ## Changes Performed:

        ### Step 1: Step 1

        #### Files: 

        file.txt

        #### Details: 

        Instructions

        #### Exit Criteria

        exit criteria



      `,
      newPrReviewers: issue.assignees.map((assignee) => assignee.login),
    });
  });

  test("editFiles succeess with local (non-LLM) applyCodePatch", async () => {
    mockedFiles.applyCodePatch.mockResolvedValueOnce([
      {
        codeBlock: "local-fixed-file-content",
        fileName: "file.txt",
        filePath: "/rootpath",
      },
    ]);
    await editFiles(editFilesParams);

    expect(mockedFiles.applyCodePatch).toHaveBeenCalledOnce();
    expect(mockedFiles.applyCodePatch).toHaveBeenLastCalledWith(
      editFilesParams.rootPath,
      "patch",
    );

    expect(mockedOperations.gitStash).not.toHaveBeenCalled();
    expect(mockedPatch.applyCodePatchViaLLM).not.toHaveBeenCalled();

    expect(mockedEvents.emitCodeEvent).toHaveBeenCalledOnce();
    expect(mockedEvents.emitCodeEvent).toHaveBeenLastCalledWith({
      ...mockEventData,
      codeBlock: "local-fixed-file-content",
      fileName: "file.txt",
      filePath: "/rootpath",
    });

    expect(mockedCheck.runBuildCheck).toHaveBeenCalledOnce();
    expect(mockedCheckAndCommit.checkAndCommit).toHaveBeenCalledOnce();
  });
});
