import { describe, test, expect, afterEach, afterAll, vi } from "vitest";
import {
  runBuildCheck,
  runNpmInstall,
  INSTALL_TIMEOUT,
  FORMAT_TIMEOUT,
  BUILD_TIMEOUT,
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

describe("runBuildCheck and runNpmInstall", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  test("runBuildCheck succeeds with default commands and environment", async () => {
    const result = await runBuildCheck(".", false);
    expect(result).toMatchObject({ stdout: "", stderr: "" });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledTimes(2);
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenNthCalledWith(
      1,
      ".",
      "npm install",
      {
        env: {
          DATABASE_URL: "file:./db.sqlite",
          EMAIL_FROM: "EMAIL_FROM",
          EMAIL_SERVER_HOST: "EMAIL_SERVER_HOST",
          EMAIL_SERVER_PASSWORD: "EMAIL_SERVER_PASSWORD",
          EMAIL_SERVER_PORT: "EMAIL_SERVER_PORT",
          EMAIL_SERVER_USER: "EMAIL_SERVER_USER",
          GITHUB_ID: "GITHUB_ID",
          GITHUB_SECRET: "GITHUB_SECRET",
          NEXTAUTH_SECRET: "NEXTAUTH_SECRET",
          NEXTAUTH_URL: "http://localhost:3000",
          NODE_ENV: "",
        },
        timeout: INSTALL_TIMEOUT,
      },
    );
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      ".",
      "__NEXT_TEST_MODE=1 npm run build --verbose; npx tsc --noEmit",
      {
        env: {
          DATABASE_URL: "file:./db.sqlite",
          EMAIL_FROM: "EMAIL_FROM",
          EMAIL_SERVER_HOST: "EMAIL_SERVER_HOST",
          EMAIL_SERVER_PASSWORD: "EMAIL_SERVER_PASSWORD",
          EMAIL_SERVER_PORT: "EMAIL_SERVER_PORT",
          EMAIL_SERVER_USER: "EMAIL_SERVER_USER",
          GITHUB_ID: "GITHUB_ID",
          GITHUB_SECRET: "GITHUB_SECRET",
          NEXTAUTH_SECRET: "NEXTAUTH_SECRET",
          NEXTAUTH_URL: "http://localhost:3000",
          NODE_ENV: "",
        },
        timeout: BUILD_TIMEOUT,
      },
    );
  });

  test("runBuildCheck uses different default buildCommand when JavaScript is specific in settings", async () => {
    await runBuildCheck(".", false, {
      env: {},
      language: Language.JavaScript,
    });
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      ".",
      "__NEXT_TEST_MODE=1 npm run build --verbose",
      { env: {}, timeout: BUILD_TIMEOUT },
    );
  });

  test("runBuildCheck uses env from settings", async () => {
    const result = await runBuildCheck(".", false, { env: {} });
    expect(result).toMatchObject({ stdout: "", stderr: "" });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledTimes(2);
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenNthCalledWith(
      1,
      ".",
      "npm install",
      { env: {}, timeout: INSTALL_TIMEOUT },
    );
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      ".",
      "__NEXT_TEST_MODE=1 npm run build --verbose; npx tsc --noEmit",
      { env: {}, timeout: BUILD_TIMEOUT },
    );
  });

  test("runBuildCheck uses commands from settings - but skips formatCommand before modifications", async () => {
    const result = await runBuildCheck(".", false, {
      env: {},
      installCommand: "my-install",
      formatCommand: "my-format",
      buildCommand: "my-build",
    });
    expect(result).toMatchObject({ stdout: "", stderr: "" });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledTimes(2);
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenNthCalledWith(
      1,
      ".",
      "my-install",
      { env: {}, timeout: INSTALL_TIMEOUT },
    );
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      ".",
      "my-build",
      { env: {}, timeout: BUILD_TIMEOUT },
    );
  });

  test("runBuildCheck uses commands from settings - including formatCommand after modifications", async () => {
    const result = await runBuildCheck(".", true, {
      env: {},
      installCommand: "my-install",
      formatCommand: "my-format",
      buildCommand: "my-build",
    });
    expect(result).toMatchObject({ stdout: "", stderr: "" });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledTimes(3);
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenNthCalledWith(
      1,
      ".",
      "my-install",
      { env: {}, timeout: INSTALL_TIMEOUT },
    );
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenNthCalledWith(
      2,
      ".",
      "my-format",
      { env: {}, timeout: FORMAT_TIMEOUT },
    );
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      ".",
      "my-build",
      { env: {}, timeout: BUILD_TIMEOUT },
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
      env: {},
      installCommand: "my-install",
      formatCommand: "my-format",
      buildCommand: "my-build",
    });
    expect(result).toMatchObject({ stdout: "", stderr: "" });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledTimes(3);
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

    await expect(() =>
      runBuildCheck(".", true, {
        env: {},
      }),
    ).rejects.toThrowError(
      "Command failed: npm run build --verbose\nerror: special stdout only error",
    );
  });

  test("runNpmInstall succeeds with default commands and environment", async () => {
    await runNpmInstall(".", "package-name");

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledOnce();
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      ".",
      "npm install package-name",
      {
        env: {
          DATABASE_URL: "file:./db.sqlite",
          EMAIL_FROM: "EMAIL_FROM",
          EMAIL_SERVER_HOST: "EMAIL_SERVER_HOST",
          EMAIL_SERVER_PASSWORD: "EMAIL_SERVER_PASSWORD",
          EMAIL_SERVER_PORT: "EMAIL_SERVER_PORT",
          EMAIL_SERVER_USER: "EMAIL_SERVER_USER",
          GITHUB_ID: "GITHUB_ID",
          GITHUB_SECRET: "GITHUB_SECRET",
          NEXTAUTH_SECRET: "NEXTAUTH_SECRET",
          NEXTAUTH_URL: "http://localhost:3000",
          NODE_ENV: "",
        },
        timeout: INSTALL_TIMEOUT,
      },
    );
  });

  test("runNpmInstall uses env from settings", async () => {
    await runNpmInstall(".", "package-name", { env: {} });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledOnce();
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      ".",
      "npm install package-name",
      { env: {}, timeout: INSTALL_TIMEOUT },
    );
  });

  test("runNpmInstall uses installCommand from settings and understands yarn add", async () => {
    await runNpmInstall(".", "package-name", {
      env: {},
      installCommand: "yarn install",
    });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledOnce();
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      ".",
      "yarn add package-name",
      { env: {}, timeout: INSTALL_TIMEOUT },
    );
  });

  test("runNpmInstall installs multiple packages", async () => {
    const result = await runNpmInstall(".", "package-name-1 package-name-2", {
      env: {},
    });
    expect(result).toMatchObject({ stdout: "", stderr: "" });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledOnce();
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      ".",
      "npm install package-name-1 package-name-2",
      { env: {}, timeout: INSTALL_TIMEOUT },
    );
  });
});
