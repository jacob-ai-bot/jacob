import dedent from "ts-dedent";
import { describe, test, expect, afterEach, afterAll, vi } from "vitest";

import { cloneRepo } from "./clone";

class TestExecAsyncException extends Error {
  stdout: string;
  stderr: string;

  constructor(message: string, stdout: string, stderr: string) {
    super(message);
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

const mockedUtils = vi.hoisted(() => ({
  executeWithLogRequiringSuccess: vi
    .fn()
    .mockImplementation(
      () => new Promise((resolve) => resolve({ stdout: "", stderr: "" })),
    ),
  getSanitizedEnv: vi.fn().mockImplementation(() => ({})),
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

describe("cloneRepo", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  test("cloneRepo succeeds with repoName alone", async () => {
    const result = await cloneRepo("organization/repo-name");
    expect(result).toStrictEqual({ cleanup: mockCleanup, path: "/tmp/path" });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalled();
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      "/tmp/path",
      "git clone  https://github.com/organization/repo-name.git .",
    );
  });

  test("cloneRepo succeeds with repoName and branch", async () => {
    const result = await cloneRepo("organization/repo-name", "branch-name");
    expect(result).toStrictEqual({ cleanup: mockCleanup, path: "/tmp/path" });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalled();
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      "/tmp/path",
      "git clone -b branch-name https://github.com/organization/repo-name.git .",
    );
  });

  test("cloneRepo succeeds with repoName, branch, and token", async () => {
    const result = await cloneRepo(
      "organization/repo-name",
      "branch-name",
      "my-token",
    );
    expect(result).toStrictEqual({ cleanup: mockCleanup, path: "/tmp/path" });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalled();
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      "/tmp/path",
      "git clone -b branch-name https://x-access-token:my-token@github.com/organization/repo-name.git .",
    );
  });

  test("cloneRepo succeeds with repoName and token", async () => {
    const result = await cloneRepo(
      "organization/repo-name",
      undefined,
      "my-token",
    );
    expect(result).toStrictEqual({ cleanup: mockCleanup, path: "/tmp/path" });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalled();
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      "/tmp/path",
      "git clone  https://x-access-token:my-token@github.com/organization/repo-name.git .",
    );
  });

  test("cloneRepo doesn't propagate token string when it fails", async () => {
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
    let errorString = "";
    try {
      await cloneRepo("organization/repo-name", undefined, "my-token");
    } catch (error) {
      errorString = (error as Error).toString();
    }
    expect(errorString).not.toContain("my-token");
    expect(errorString).toBe(
      "Error: Command failed: git clone  https://x-access-token:<redacted>@github.com/organization/repo-name.git .",
    );
  });
});
