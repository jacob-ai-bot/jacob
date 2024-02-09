import { describe, test, expect, afterEach, afterAll, vi } from "vitest";
import { runBuildCheck, runNpmInstall } from "./check";
import { Language } from "../../utils/settings";

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
      { env: {} },
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
      { env: {} },
    );
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      ".",
      "__NEXT_TEST_MODE=1 npm run build --verbose; npx tsc --noEmit",
      { env: {} },
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
      { env: {} },
    );
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      ".",
      "my-build",
      { env: {} },
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
      { env: {} },
    );
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenNthCalledWith(
      2,
      ".",
      "my-format",
      { env: {} },
    );
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      ".",
      "my-build",
      { env: {} },
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
      },
    );
  });

  test("runNpmInstall uses env from settings", async () => {
    await runNpmInstall(".", "package-name", { env: {} });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledOnce();
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      ".",
      "npm install package-name",
      { env: {} },
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
      { env: {} },
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
      { env: {} },
    );
  });
});
