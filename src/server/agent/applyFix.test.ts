import { describe, test, expect, afterEach, afterAll, vi } from "vitest";
import { type Repository } from "@octokit/webhooks-types";

import { applyAndEvaluateFix } from "./applyFix";
import { type PullRequest } from "~/server/code/agentFixError";

const mockedPatch = vi.hoisted(() => ({
  applyCodePatchViaLLM: vi
    .fn()
    .mockResolvedValue("<file_content>file-content</file_content>"),
}));
vi.mock("./patch", () => mockedPatch);

const mockedCommit = vi.hoisted(() => ({
  addCommitAndPush: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("~/server/git/commit", () => mockedCommit);

const mockedCheck = vi.hoisted(() => ({
  runBuildCheck: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("~/server/build/node/check", () => mockedCheck);

const mockedLLMParseErrors = vi.hoisted(() => ({
  parseBuildErrors: vi.fn().mockResolvedValue([]),
}));
vi.mock("./llmParseErrors", () => mockedLLMParseErrors);

const mockEventData = {
  projectId: 1,
  repoFullName: "test-login/test-repo",
  userId: "test-user",
};

describe("applyAndEvaluateFix", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  test("success", async () => {
    const allErrors = [
      {
        filePath: "src/file.txt",
        lineNumber: 4,
        errorType: "error",
        errorMessage: "error message",
      },
    ];

    const result = await applyAndEvaluateFix(
      {
        id: "agent-id-1",
        errors: allErrors,
        potentialFixes: ["potential-fix"],
        appliedFix: "applied-fix",
        buildOutput: "build-output",
        commitHash: "commit-hash",
        branchName: "branch-name",
      },
      "potential-fix",
      {
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
      },
      allErrors,
    );

    expect(result).toStrictEqual({
      buildOutput: "Build successful",
      success: true,
      resolvedErrors: allErrors,
    });

    expect(mockedPatch.applyCodePatchViaLLM).toHaveBeenCalledOnce();
    expect(mockedPatch.applyCodePatchViaLLM).toHaveBeenLastCalledWith(
      "/rootpath",
      "src/file.txt",
      "potential-fix",
    );

    expect(mockedCommit.addCommitAndPush).toHaveBeenCalledOnce();
    expect(mockedCommit.addCommitAndPush).toHaveBeenLastCalledWith({
      branchName: "branch-name",
      commitMessage: "Apply fix for src/file.txt",
      projectId: 1,
      repoFullName: "test-login/test-repo",
      rootPath: "/rootpath",
      token: "token",
      userId: "test-user",
    });

    expect(mockedCheck.runBuildCheck).toHaveBeenCalledOnce();
    expect(mockedCheck.runBuildCheck).toHaveBeenLastCalledWith({
      afterModifications: true,
      path: "/rootpath",
      projectId: 1,
      repoFullName: "test-login/test-repo",
      repoSettings: undefined,
      userId: "test-user",
    });

    expect(mockedLLMParseErrors.parseBuildErrors).toHaveBeenCalledOnce();
    expect(mockedLLMParseErrors.parseBuildErrors).toHaveBeenLastCalledWith(
      "Build successful",
    );
  });
});
