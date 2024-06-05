import { dedent } from "ts-dedent";
import { describe, test, expect, afterEach, afterAll, vi } from "vitest";

import { cloneRepo } from "./clone";
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

describe("cloneRepo", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  test("cloneRepo succeeds with repoName alone", async () => {
    const result = await cloneRepo({
      baseEventData: mockEventData,
      repoName: "organization/repo-name",
    });
    expect(result).toStrictEqual({ cleanup: mockCleanup, path: "/tmp/path" });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalled();
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      {
        ...mockEventData,
        directory: "/tmp/path",
        command: "git clone  https://github.com/organization/repo-name.git .",
      },
    );
  });

  test("cloneRepo succeeds with repoName and branch", async () => {
    const result = await cloneRepo({
      baseEventData: mockEventData,
      repoName: "organization/repo-name",
      branch: "branch-name",
    });
    expect(result).toStrictEqual({ cleanup: mockCleanup, path: "/tmp/path" });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalled();
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      {
        ...mockEventData,
        directory: "/tmp/path",
        command:
          "git clone -b branch-name https://github.com/organization/repo-name.git .",
      },
    );
  });

  test("cloneRepo succeeds with repoName, branch, and token", async () => {
    const result = await cloneRepo({
      baseEventData: mockEventData,
      repoName: "organization/repo-name",
      branch: "branch-name",
      token: "my-token",
    });
    expect(result).toStrictEqual({ cleanup: mockCleanup, path: "/tmp/path" });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalled();
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      {
        ...mockEventData,
        directory: "/tmp/path",
        command:
          "git clone -b branch-name https://x-access-token:my-token@github.com/organization/repo-name.git .",
      },
    );
  });

  test("cloneRepo succeeds with repoName and token", async () => {
    const result = await cloneRepo({
      baseEventData: mockEventData,
      repoName: "organization/repo-name",
      token: "my-token",
    });
    expect(result).toStrictEqual({ cleanup: mockCleanup, path: "/tmp/path" });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalled();
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      {
        ...mockEventData,
        directory: "/tmp/path",
        command:
          "git clone  https://x-access-token:my-token@github.com/organization/repo-name.git .",
      },
    );
  });

  test("cloneRepo calls rethrowErrorWithTokenRedacted() when it fails", async () => {
    mockedUtils.executeWithLogRequiringSuccess.mockImplementationOnce(
      () =>
        new Promise((_, reject) =>
          reject(
            new TestExecAsyncException(
              "Command failed: git clone  https://x-access-token:my-token@github.com/organization/repo-name.git .",
              dedent`
                Cloning into '.'...
                fatal: the remote end hung up unexpectedly
                fatal: early EOF
                fatal: index-pack failed
              `,
              "",
            ),
          ),
        ),
    );
    await cloneRepo({
      baseEventData: mockEventData,
      repoName: "organization/repo-name",
      token: "my-token",
    });
    expect(mockedUtils.rethrowErrorWithTokenRedacted).toHaveBeenCalled();
  });
});
