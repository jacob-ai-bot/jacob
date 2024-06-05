import { dedent } from "ts-dedent";
import { describe, test, expect, afterEach, afterAll, vi } from "vitest";

import { addCommitAndPush } from "./commit";
import { TestExecAsyncException } from "~/server/utils/testHelpers";

const mockedUtils = vi.hoisted(() => ({
  executeWithLogRequiringSuccess: vi
    .fn()
    .mockResolvedValue({ stdout: "", stderr: "" }),
  getSanitizedEnv: vi.fn().mockImplementation(() => ({})),
  rethrowErrorWithTokenRedacted: vi.fn(),
}));
vi.mock("../utils", () => mockedUtils);

const mockCleanup = vi.fn();
const mockedTmpPromise = vi.hoisted(() => ({
  dir: vi
    .fn()
    .mockImplementation(
      () =>
        new Promise((resolve) =>
          resolve({ path: "/tmp/path", cleanup: mockCleanup }),
        ),
    ),
}));
vi.mock("tmp-promise", () => mockedTmpPromise);

const mockEventData = {
  projectId: 1,
  repoFullName: "test-login/test-repo",
  userId: "test-user",
};

describe("addCommitAndPush", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  test("addCommitAndPush calls rethrowErrorWithTokenRedacted() when it fails", async () => {
    mockedUtils.executeWithLogRequiringSuccess
      .mockResolvedValueOnce({ stdout: "", stderr: "" })
      .mockResolvedValueOnce({ stdout: "", stderr: "" })
      .mockResolvedValueOnce({ stdout: "", stderr: "" })
      .mockResolvedValueOnce({ stdout: "", stderr: "" })
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) =>
            reject(
              new TestExecAsyncException(
                "Command failed: git push --set-upstream origin jacob-issue-1-1717533860017",
                dedent`
                To https://github.com/kleneway/jacob.git
                ! [rejected]        jacob-issue-1-1717533860017 -> jacob-issue-1-1717533860017 (fetch first)
                error: failed to push some refs to 'https://x-access-token:my-token@github.com/kleneway/jacob.git'
                hint: Updates were rejected because the remote contains work that you do
                hint: not have locally. This is usually caused by another repository pushing
                hint: to the same ref. You may want to first integrate the remote changes
                hint: (e.g., 'git pull ...') before pushing again.
                hint: See the 'Note about fast-forwards' in 'git push --help' for details.
              `,
                "",
              ),
            ),
          ),
      );
    await addCommitAndPush({
      ...mockEventData,
      rootPath: "/tmp/path",
      branchName: "jacob-issue-1-1717533860017",
      commitMessage: "my commit message",
      token: "my-token",
    });
    expect(mockedUtils.rethrowErrorWithTokenRedacted).toHaveBeenCalled();
  });
});
