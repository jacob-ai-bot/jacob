/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { describe, test, expect, afterEach, afterAll, vi } from "vitest";
import { type Repository } from "@octokit/webhooks-types";

import { generatePotentialFixes } from "./bugfix";
import { type PullRequest } from "~/server/code/agentFixError";

const mockFileContent = vi.hoisted(() => "File: file.txt\n1| file-content\n");
const mockFiles = vi.hoisted(() => ({
  getFiles: vi.fn().mockReturnValue(mockFileContent),
}));
vi.mock("../utils/files", () => mockFiles);

const mockedRequest = vi.hoisted(() => ({
  sendGptRequestWithSchema: vi.fn().mockResolvedValue([]),
  sendGptRequest: vi.fn().mockResolvedValue("<code_patch>patch</code_patch>"),
}));
vi.mock("~/server/openai/request", () => mockedRequest);

const mockEventData = {
  projectId: 1,
  repoFullName: "test-login/test-repo",
  userId: "test-user",
};

describe("generatePotentialFixes", () => {
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

    const agent = {
      id: "agent-id-1",
      errors: allErrors,
      potentialFixes: ["potential-fix"],
      appliedFix: "applied-fix",
      buildOutput: "build-output",
      commitHash: "commit-hash",
      branchName: "branch-name",
    };

    const result = await generatePotentialFixes(agent, {
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
    });

    expect(result).toStrictEqual(["patch"]);

    expect(mockFiles.getFiles).toHaveBeenCalledOnce();
    expect(mockFiles.getFiles).toHaveBeenLastCalledWith("/rootpath", [
      "src/file.txt",
    ]);

    expect(mockedRequest.sendGptRequest).toHaveBeenCalledOnce();
    expect(mockedRequest.sendGptRequest.mock.lastCall[0]).toContain(
      "Given the following TypeScript build errors and file content, suggest up to 3 potential fixes:",
    );
    expect(mockedRequest.sendGptRequest.mock.lastCall[0]).toContain(
      "src/file.txt: 4 - error: error message",
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
});
