import { describe, test, expect, afterEach, afterAll, vi } from "vitest";
import {
  runBuildCheck,
  runNpmInstall,
  INSTALL_TIMEOUT,
  FORMAT_TIMEOUT,
  BUILD_TIMEOUT,
  TEST_TIMEOUT,
  NEXT_JS_ENV,
  getEnv,
} from "./check";
import { Language } from "../../utils/settings";

class TestExecAsyncException extends Error {
  stdout: string;
  stderr: string;

  constructor(message: string, stdout: string, stderr: string) {
    super(message);
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

const mockedDynamicImport = vi.hoisted(() => ({
  dynamicImport: vi
    .fn()
    .mockImplementation(async (specifier) => await import(specifier)),
}));
vi.mock("../../utils/dynamicImport", () => mockedDynamicImport);

const mockedUtils = vi.hoisted(() => ({
  executeWithLogRequiringSuccess: vi
    .fn()
    .mockImplementation(
      () => new Promise((resolve) => resolve({ stdout: "", stderr: "" })),
    ),
  getSanitizedEnv: vi.fn().mockImplementation(() => ({})),
}));
vi.mock("../../utils", () => mockedUtils);

describe("getEnv", () => {
  test("default is empty object with CI added", () => {
    const env = getEnv();
    expect(env).toStrictEqual({ CI: "true" });
  });

  test("empty string env key in repo settings still returns empty object with CI added", () => {
    const env = getEnv({ env: "" as unknown as Record<string, string> });
    expect(env).toStrictEqual({ CI: "true" });
  });

  test("env in repo settings returned with CI added", () => {
    const env = getEnv({
      packageDependencies: { next: "1.0.0" },
      env: { custom: "1" },
    });
    expect(env).toStrictEqual({ CI: "true", custom: "1" });
  });

  test("Next.js projects: default is a NEXT_JS_ENV with CI added", () => {
    const env = getEnv({ packageDependencies: { next: "1.0.0" } });
    expect(env).toStrictEqual({ CI: "true", ...NEXT_JS_ENV });
  });

  test("Next.js projects: empty string env key in repo settings still returns a NEXT_JS_ENV with CI added", () => {
    const env = getEnv({
      packageDependencies: { next: "1.0.0" },
      env: "" as unknown as Record<string, string>,
    });
    expect(env).toStrictEqual({ CI: "true", ...NEXT_JS_ENV });
  });

  test("Next.js projects: empty env in repo settings returned with CI added", () => {
    const env = getEnv({ packageDependencies: { next: "1.0.0" }, env: {} });
    expect(env).toStrictEqual({ CI: "true" });
  });
});

describe("runBuildCheck and runNpmInstall", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  test("runBuildCheck succeeds with default commands and environment", async () => {
    const result = await runBuildCheck(".", false);
    expect(result).toStrictEqual({ stdout: "", stderr: "" });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledTimes(2);
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenNthCalledWith(
      1,
      ".",
      "npm install",
      {
        env: { CI: "true" },
        timeout: INSTALL_TIMEOUT,
      },
    );
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenNthCalledWith(
      2,
      ".",
      "npm run build --verbose && npx tsc --noEmit",
      {
        env: { CI: "true" },
        timeout: BUILD_TIMEOUT,
      },
    );
  });

  test("runBuildCheck succeeds with default commands and environment for a Next.js project", async () => {
    const result = await runBuildCheck(".", false, {
      packageDependencies: { next: "1.0.0" },
    });
    expect(result).toStrictEqual({ stdout: "", stderr: "" });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledTimes(2);
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenNthCalledWith(
      1,
      ".",
      "npm install",
      {
        env: {
          CI: "true",
          ...NEXT_JS_ENV,
        },
        timeout: INSTALL_TIMEOUT,
      },
    );
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenNthCalledWith(
      2,
      ".",
      "__NEXT_TEST_MODE=1 SKIP_ENV_VALIDATION=1 npm run build --verbose && npx tsc --noEmit",
      {
        env: {
          CI: "true",
          ...NEXT_JS_ENV,
        },
        timeout: BUILD_TIMEOUT,
      },
    );
  });

  test("runBuildCheck uses different default buildCommand when JavaScript is specific in settings", async () => {
    await runBuildCheck(".", false, {
      language: Language.JavaScript,
    });
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenNthCalledWith(
      2,
      ".",
      "npm run build --verbose",
      { env: { CI: "true" }, timeout: BUILD_TIMEOUT },
    );
  });

  test("runBuildCheck uses env from settings", async () => {
    const result = await runBuildCheck(".", false, { env: { custom: "1" } });
    expect(result).toStrictEqual({ stdout: "", stderr: "" });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledTimes(2);
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenNthCalledWith(
      1,
      ".",
      "npm install",
      { env: { CI: "true", custom: "1" }, timeout: INSTALL_TIMEOUT },
    );
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenNthCalledWith(
      2,
      ".",
      "npm run build --verbose && npx tsc --noEmit",
      { env: { CI: "true", custom: "1" }, timeout: BUILD_TIMEOUT },
    );
  });

  test("runBuildCheck uses commands from settings - but skips formatCommand before modifications", async () => {
    const result = await runBuildCheck(".", false, {
      installCommand: "my-install",
      formatCommand: "my-format",
      buildCommand: "my-build",
      testCommand: "my-test",
    });
    expect(result).toStrictEqual({ stdout: "", stderr: "" });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledTimes(3);
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenNthCalledWith(
      1,
      ".",
      "my-install",
      { env: { CI: "true" }, timeout: INSTALL_TIMEOUT },
    );
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenNthCalledWith(
      2,
      ".",
      "my-build",
      { env: { CI: "true" }, timeout: BUILD_TIMEOUT },
    );
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      ".",
      "my-test",
      { env: { CI: "true" }, timeout: TEST_TIMEOUT },
    );
  });

  test("runBuildCheck uses commands from settings - including formatCommand after modifications", async () => {
    const result = await runBuildCheck(".", true, {
      installCommand: "my-install",
      formatCommand: "my-format",
      buildCommand: "my-build",
      testCommand: "my-test",
    });
    expect(result).toStrictEqual({ stdout: "", stderr: "" });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledTimes(4);
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenNthCalledWith(
      1,
      ".",
      "my-install",
      { env: { CI: "true" }, timeout: INSTALL_TIMEOUT },
    );
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenNthCalledWith(
      2,
      ".",
      "my-format",
      { env: { CI: "true" }, timeout: FORMAT_TIMEOUT },
    );
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenNthCalledWith(
      3,
      ".",
      "my-build",
      { env: { CI: "true" }, timeout: BUILD_TIMEOUT },
    );
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      ".",
      "my-test",
      { env: { CI: "true" }, timeout: TEST_TIMEOUT },
    );
  });

  test("runBuildCheck ignores errors from the formatCommand", async () => {
    // Fail the 2nd command only (the format command)
    mockedUtils.executeWithLogRequiringSuccess
      .mockImplementationOnce(
        () => new Promise((resolve) => resolve({ stdout: "", stderr: "" })),
      )
      .mockImplementationOnce(
        () => new Promise((_, reject) => reject(new Error("format error"))),
      );

    const result = await runBuildCheck(".", true, {
      installCommand: "my-install",
      formatCommand: "my-format",
      buildCommand: "my-build",
      testCommand: "my-test",
    });
    expect(result).toStrictEqual({ stdout: "", stderr: "" });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledTimes(4);
  });

  test("runBuildCheck propagates errors from the buildCommand", async () => {
    // Fail the 2nd command only (the build command)
    mockedUtils.executeWithLogRequiringSuccess
      .mockImplementationOnce(
        () => new Promise((resolve) => resolve({ stdout: "", stderr: "" })),
      )
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) =>
            reject(
              new TestExecAsyncException(
                "Command failed: npm run build --verbose",
                "error: special stdout only error",
                "",
              ),
            ),
          ),
      );

    await expect(() => runBuildCheck(".", true)).rejects.toThrowError(
      "Command failed: npm run build --verbose\nerror: special stdout only error",
    );
  });

  test("runNpmInstall succeeds with default commands and environment", async () => {
    await runNpmInstall(".", "package-name");

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledOnce();
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      ".",
      "npm add package-name",
      {
        env: { CI: "true" },
        timeout: INSTALL_TIMEOUT,
      },
    );
  });

  test("runNpmInstall uses env from settings", async () => {
    await runNpmInstall(".", "package-name", { env: { custom: "1" } });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledOnce();
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      ".",
      "npm add package-name",
      { env: { CI: "true", custom: "1" }, timeout: INSTALL_TIMEOUT },
    );
  });

  test("runNpmInstall uses installCommand from settings and understands yarn add", async () => {
    await runNpmInstall(".", "package-name", {
      installCommand: "yarn install",
    });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledOnce();
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      ".",
      "yarn add package-name",
      { env: { CI: "true" }, timeout: INSTALL_TIMEOUT },
    );
  });

  test("runNpmInstall installs multiple packages", async () => {
    const result = await runNpmInstall(
      ".",
      "package-name-1 package-name-2",
      {},
    );
    expect(result).toStrictEqual({ stdout: "", stderr: "" });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledOnce();
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      ".",
      "npm add package-name-1 package-name-2",
      { env: { CI: "true" }, timeout: INSTALL_TIMEOUT },
    );
  });
});
