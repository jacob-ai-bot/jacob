import { describe, test, expect, afterEach, afterAll, vi } from "vitest";
import { type Issue, type Repository } from "@octokit/webhooks-types";
import { dedent } from "ts-dedent";

import { useTestDatabase } from "~/server/utils/testHelpers";
import issueCommentCreatedPRCommandFixErrorPayload from "../../data/test/webhooks/issue_comment.created.prCommand.fixError.json";
import {
  type AgentFixErrorParams,
  fixError,
  type PullRequest,
} from "./agentFixError";
import { type CheckAndCommitOptions } from "./checkAndCommit";

const mockedCheckAndCommit = vi.hoisted(() => ({
  checkAndCommit: vi
    .fn()
    .mockImplementation(() => new Promise((resolve) => resolve(undefined))),
}));
vi.mock("./checkAndCommit", () => mockedCheckAndCommit);

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

const mockedBugfix = vi.hoisted(() => ({
  fixBuildErrors: vi.fn().mockResolvedValue([]),
}));
vi.mock("~/server/agent/bugfix", () => mockedBugfix);

describe("fixError", () => {
  useTestDatabase();

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  const prIssue = issueCommentCreatedPRCommandFixErrorPayload.issue as Issue;
  const mockEventData = {
    projectId: 1,
    repoFullName: "test-login/test-repo",
    userId: "test-user",
  };

  const agentFixErrorParams: AgentFixErrorParams = {
    ...mockEventData,
    repository: {
      owner: { login: "test-login" },
      name: "test-repo",
    } as Repository,
    token: "token",
    prIssue,
    body: "## Error Message (Attempt Number 2):\n```\nbuild-error-info\n\n```\n## Something else\n\n",
    rootPath: "/rootpath",
    branch: "jacob-issue-48-test",
    existingPr: { number: 48 } as PullRequest,
  };

  test("fixError success path", async () => {
    await fixError(agentFixErrorParams);

    expect(mockedBugfix.fixBuildErrors).toHaveBeenCalledOnce();
    expect(mockedBugfix.fixBuildErrors).toHaveBeenLastCalledWith({
      repository: agentFixErrorParams.repository,
      token: agentFixErrorParams.token,
      prIssue: agentFixErrorParams.prIssue,
      body: agentFixErrorParams.body,
      rootPath: agentFixErrorParams.rootPath,
      branch: agentFixErrorParams.branch,
      existingPr: agentFixErrorParams.existingPr,
      sourceMapOrFileList: "source map",
      baseEventData: mockEventData,
      types: "types",
      packages: "",
      styles: "",
      images: "images",
      research: "",
    });

    expect(mockedIssue.addCommentToIssue).not.toHaveBeenCalled();

    expect(mockedCheckAndCommit.checkAndCommit).toHaveBeenCalledOnce();
    const checkAndCommitCalls = mockedCheckAndCommit.checkAndCommit.mock.calls;
    const checkAndCommitOptions =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      checkAndCommitCalls[0]![0] as CheckAndCommitOptions;
    expect(checkAndCommitOptions.commitMessage).toBe(
      "JACoB fix error: Build error fix",
    );
    expect(checkAndCommitOptions.buildErrorAttemptNumber).toBe(2);
  });

  test("fixError handles fixBuildErrors failure", async () => {
    mockedBugfix.fixBuildErrors.mockRejectedValueOnce(
      new Error("fixBuildErrors error"),
    );

    await expect(fixError(agentFixErrorParams)).rejects.toThrowError(
      "fixBuildErrors error",
    );

    expect(mockedBugfix.fixBuildErrors).toHaveBeenCalledOnce();
    expect(mockedBugfix.fixBuildErrors).toHaveBeenLastCalledWith({
      repository: agentFixErrorParams.repository,
      token: agentFixErrorParams.token,
      prIssue: agentFixErrorParams.prIssue,
      body: agentFixErrorParams.body,
      rootPath: agentFixErrorParams.rootPath,
      branch: agentFixErrorParams.branch,
      existingPr: agentFixErrorParams.existingPr,
      sourceMapOrFileList: "source map",
      baseEventData: mockEventData,
      types: "types",
      packages: "",
      styles: "",
      images: "images",
      research: "",
    });

    expect(mockedCheckAndCommit.checkAndCommit).not.toHaveBeenCalled();

    expect(mockedIssue.addCommentToIssue).toHaveBeenCalledOnce();
    expect(mockedIssue.addCommentToIssue).toHaveBeenLastCalledWith(
      agentFixErrorParams.repository,
      48,
      agentFixErrorParams.token,
      dedent`
        JACoB here once again...
        
        Unfortunately, I wasn't able to resolve all the error(s).
        
        Here is some information about the error(s):
        
        Error: fixBuildErrors error
        
        This was my last attempt to fix the error(s). Please review the error(s) and try to fix them manually, or you may do a code review to provide additional information and I will try to fix the error(s) again.
      `,
    );
  });
});
