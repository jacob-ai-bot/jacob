import { dedent } from "ts-dedent";
import { describe, test, expect, afterEach, afterAll, vi } from "vitest";

import {
  gitCommit,
  gitStash,
  gitStashPop,
  gitCheckout,
  gitBranch,
  gitPush,
  gitPull,
  gitReset,
} from "./operations";
import { TestExecAsyncException } from "~/server/utils/testHelpers";

const mockedUtils = vi.hoisted(() => ({
  executeWithLogRequiringSuccess: vi
    .fn()
    .mockResolvedValue({ stdout: "", stderr: "" }),
  executeWithLogRequiringSuccessWithoutEvent: vi
    .fn()
    .mockResolvedValue({ stdout: "", stderr: "" }),
  rethrowErrorWithTokenRedacted: vi.fn(),
}));
vi.mock("../utils", () => mockedUtils);

const mockEventData = {
  projectId: 1,
  repoFullName: "test-login/test-repo",
  userId: "test-user",
};

const mockParams = {
  directory: "/test/directory",
  token: "test-token",
  baseEventData: mockEventData,
};

describe.only("Git Operations", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  test("gitCommit succeeds", async () => {
    mockedUtils.executeWithLogRequiringSuccessWithoutEvent.mockResolvedValueOnce(
      {
        stdout: "abcdef1234567890",
        stderr: "",
      },
    );
    const result = await gitCommit("Test commit message", mockParams);
    expect(result).toBe("abcdef1234567890");
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledWith({
      ...mockEventData,
      directory: "/test/directory",
      command: 'git commit -m "Test commit message"',
    });
  });

  test("gitStash succeeds", async () => {
    await gitStash(mockParams);
    expect(
      mockedUtils.executeWithLogRequiringSuccessWithoutEvent,
    ).toHaveBeenCalledWith({
      ...mockParams,
      command: "git stash",
    });
  });

  test("gitStashPop succeeds", async () => {
    await gitStashPop(mockParams);
    expect(
      mockedUtils.executeWithLogRequiringSuccessWithoutEvent,
    ).toHaveBeenCalledWith({
      ...mockParams,
      command: "git stash pop",
    });
  });

  test("gitCheckout succeeds", async () => {
    await gitCheckout("test-branch", mockParams);
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledWith({
      ...mockEventData,
      directory: "/test/directory",
      command: "git checkout test-branch",
    });
  });

  test("gitBranch succeeds", async () => {
    await gitBranch("new-branch", mockParams);
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledWith({
      ...mockEventData,
      directory: "/test/directory",
      command: "git branch new-branch",
    });
  });

  test("gitPush succeeds", async () => {
    await gitPush("test-branch", mockParams);
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledWith({
      ...mockEventData,
      directory: "/test/directory",
      command: "git push origin test-branch",
    });
  });

  test("gitPull succeeds", async () => {
    await gitPull(mockParams);
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledWith({
      ...mockEventData,
      directory: "/test/directory",
      command: "git pull",
    });
  });

  test("gitReset succeeds", async () => {
    await gitReset("hard", "HEAD~1", mockParams);
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledWith({
      ...mockEventData,
      directory: "/test/directory",
      command: "git reset --hard HEAD~1",
    });
  });

  test("Git operations call rethrowErrorWithTokenRedacted() when they fail", async () => {
    mockedUtils.executeWithLogRequiringSuccess.mockImplementationOnce(
      () =>
        new Promise((_, reject) =>
          reject(
            new TestExecAsyncException(
              "Command failed: git push origin test-branch",
              dedent`
                fatal: The current branch test-branch has no upstream branch.
                To push the current branch and set the remote as upstream, use

                    git push --set-upstream origin test-branch
              `,
              "",
            ),
          ),
        ),
    );
    await gitPush("test-branch", mockParams);
    expect(mockedUtils.rethrowErrorWithTokenRedacted).toHaveBeenCalled();
  });
});
