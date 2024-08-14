/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { describe, test, expect, afterEach, afterAll, vi } from "vitest";
import { type Repository } from "@octokit/webhooks-types";

import {
  generatePotentialFixes,
  createBugAgents,
  fixBuildErrors,
} from "./bugfix";
import { type PullRequest } from "~/server/code/agentFixError";

const mockFileContent = vi.hoisted(() => "File: file.txt\n1| file-content\n");
const mockedFiles = vi.hoisted(() => ({
  getFiles: vi.fn().mockReturnValue(mockFileContent),
  standardizePath: vi.fn().mockReturnValue("/src/file.txt"),
}));
vi.mock("../utils/files", () => mockedFiles);

const mockedRequest = vi.hoisted(() => ({
  sendGptRequestWithSchema: vi
    .fn()
    .mockResolvedValue({ needsNpmInstall: false, packagesToInstall: [] }),
  sendGptRequest: vi.fn().mockResolvedValue("<code_patch>patch</code_patch>"),
}));
vi.mock("~/server/openai/request", () => mockedRequest);

const mockedCheck = vi.hoisted(() => ({
  runBuildCheck: vi.fn().mockResolvedValue(undefined),
  runNpmInstall: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("~/server/build/node/check", () => mockedCheck);

const mockedApplyFix = vi.hoisted(() => ({
  applyAndEvaluateFix: vi
    .fn()
    .mockResolvedValue({ success: true, buildOutput: "", resolvedErrors: [] }),
}));
vi.mock("./applyFix", () => mockedApplyFix);

const mockEventData = {
  projectId: 1,
  repoFullName: "test-login/test-repo",
  userId: "test-user",
};

const mockParsedErrors = vi.hoisted(() => [
  {
    filePath: "/src/file.txt",
    lineNumber: 4,
    errorType: "error",
    errorMessage: "error message",
  },
  {
    filePath: "/src/file.ts",
    lineNumber: 7,
    errorType: "warning",
    errorMessage: "warning message",
  },
]);

const mockedLLMParseErrors = vi.hoisted(() => ({
  parseBuildErrors: vi.fn().mockResolvedValue(mockParsedErrors),
}));
vi.mock("./llmParseErrors", () => mockedLLMParseErrors);

describe("bugfix functions", () => {
  const projectContext = {
    repository: {
      owner: { login: "test-login" },
      name: "test-repo",
    } as Repository,
    baseEventData: mockEventData,
    existingPr: { number: 48 } as PullRequest,
    rootPath: "/rootpath",
    token: "token",
    prIssue: null,
    body: null,
    branch: "branch-name",
    types: "types",
    packages: "packages",
    styles: "styles",
    images: "images",
    research: "research",
    sourceMapOrFileList: "source map",
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  test("createBugAgents - success", async () => {
    const result = await createBugAgents("build errors");
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      appliedFix: null,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      branchName: expect.stringContaining("fix-file.txt-"),
      buildOutput: null,
      commitHash: null,
      errors: [mockParsedErrors[0]],
      potentialFixes: [],
    });
    expect(result[1]).toMatchObject({
      appliedFix: null,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      branchName: expect.stringContaining("fix-file.ts-"),
      buildOutput: null,
      commitHash: null,
      errors: [mockParsedErrors[1]],
      potentialFixes: [],
    });
  });

  test("generatePotentialFixes - success", async () => {
    const allErrors = [
      {
        filePath: "/src/file.txt",
        lineNumber: 4,
        errorType: "error",
        errorMessage: "error message",
      },
    ];

    const agent = {
      id: "agent-id-1",
      errors: allErrors,
      potentialFixes: ["potential-fix"],
      appliedFix: "applied-fix",
      buildOutput: "build-output",
      commitHash: "commit-hash",
      branchName: "branch-name",
    };

    const result = await generatePotentialFixes(agent, projectContext);

    expect(result).toStrictEqual(["patch"]);

    expect(mockedFiles.getFiles).toHaveBeenCalledOnce();
    expect(mockedFiles.getFiles).toHaveBeenLastCalledWith("/rootpath", [
      "/src/file.txt",
    ]);

    expect(mockedRequest.sendGptRequest).toHaveBeenCalledOnce();
    expect(mockedRequest.sendGptRequest.mock.lastCall[0]).toContain(
      "Given the following TypeScript build errors and file content, suggest up to 3 potential fixes:",
    );
    expect(mockedRequest.sendGptRequest.mock.lastCall[0]).toContain(
      "/src/file.txt: 4 - error: error message",
    );
    expect(mockedRequest.sendGptRequest.mock.lastCall[0]).toContain(
      mockFileContent,
    );
    expect(mockedRequest.sendGptRequest.mock.lastCall[1]).toContain(
      "You are a senior Technical Fellow at Microsoft, tasked with addressing TypeScript build errors by making precise, minimal changes to the code.",
    );
    expect(mockedRequest.sendGptRequest.mock.lastCall[1]).toContain(
      "File List: source map",
    );
    expect(mockedRequest.sendGptRequest.mock.lastCall[1]).toContain(
      "Types: types",
    );
    expect(mockedRequest.sendGptRequest.mock.lastCall[1]).toContain(
      "Packages: packages",
    );
    expect(mockedRequest.sendGptRequest.mock.lastCall[1]).toContain(
      "Styles: styles",
    );
    expect(mockedRequest.sendGptRequest.mock.lastCall[1]).toContain(
      "Images: images",
    );
    expect(mockedRequest.sendGptRequest.mock.lastCall[1]).toContain(
      "Research: research",
    );
  });

  test("fixBuildErrors - success", async () => {
    const result = await fixBuildErrors(projectContext);

    expect(result).toStrictEqual([]);

    expect(mockedCheck.runBuildCheck).toHaveBeenCalledOnce();

    expect(mockedRequest.sendGptRequestWithSchema).not.toHaveBeenCalled();
    expect(mockedLLMParseErrors.parseBuildErrors).not.toHaveBeenCalled();
    expect(mockedFiles.getFiles).not.toHaveBeenCalled();
    expect(mockedApplyFix.applyAndEvaluateFix).not.toHaveBeenCalled();
  });

  test("fixBuildErrors - two parsed build errors resolved", async () => {
    mockedCheck.runBuildCheck.mockRejectedValueOnce("build errors");

    const result = await fixBuildErrors(projectContext);

    expect(result).toStrictEqual(["patch", "patch"]);

    expect(mockedCheck.runBuildCheck).toHaveBeenCalledTimes(2);

    expect(mockedRequest.sendGptRequestWithSchema).toHaveBeenCalledOnce();

    expect(mockedLLMParseErrors.parseBuildErrors).toHaveBeenCalledOnce();

    expect(mockedFiles.getFiles).toHaveBeenCalledTimes(2);

    expect(mockedApplyFix.applyAndEvaluateFix).toHaveBeenCalledTimes(2);
  });

  test("fixBuildErrors - npm package install error resolved", async () => {
    mockedCheck.runBuildCheck.mockRejectedValueOnce("missing package error");
    mockedRequest.sendGptRequestWithSchema.mockResolvedValue({
      needsNpmInstall: true,
      packagesToInstall: ["example-package"],
    });

    const result = await fixBuildErrors(projectContext);

    expect(result).toStrictEqual(["Installed required npm package(s)"]);

    expect(mockedCheck.runBuildCheck).toHaveBeenCalledTimes(2);

    expect(mockedRequest.sendGptRequestWithSchema).toHaveBeenCalledOnce();

    expect(mockedLLMParseErrors.parseBuildErrors).not.toHaveBeenCalled();
    expect(mockedFiles.getFiles).not.toHaveBeenCalled();
    expect(mockedApplyFix.applyAndEvaluateFix).not.toHaveBeenCalled();
  });
});
