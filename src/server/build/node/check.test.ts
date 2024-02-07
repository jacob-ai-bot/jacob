import { describe, test, expect, afterEach, afterAll, vi } from "vitest";
import { runBuildCheck, runNpmInstall } from "./check";

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
    const result = await runBuildCheck(".");
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

  test("runBuildCheck uses env from settings", async () => {
    const result = await runBuildCheck(".", { env: {} });
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

  test("runBuildCheck uses installCommand and buildCommand from settings", async () => {
    const result = await runBuildCheck(".", {
      env: {},
      installCommand: "my-install",
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

  test("runNpmInstall succeeds with default commands and environment", async () => {
    const result = await runNpmInstall(".", "package-name");
    expect(result).toMatchObject({ stdout: "", stderr: "" });

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
    const result = await runNpmInstall(".", "package-name", { env: {} });
    expect(result).toMatchObject({ stdout: "", stderr: "" });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledOnce();
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      ".",
      "npm install package-name",
      { env: {} },
    );
  });

  test("runNpmInstall uses installCommand from settings and understands yarn add", async () => {
    const result = await runNpmInstall(".", "package-name", {
      env: {},
      installCommand: "yarn install",
    });
    expect(result).toMatchObject({ stdout: "", stderr: "" });

    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenCalledOnce();
    expect(mockedUtils.executeWithLogRequiringSuccess).toHaveBeenLastCalledWith(
      ".",
      "yarn add package-name",
      { env: {} },
    );
  });
});
