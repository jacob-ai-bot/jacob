import stripAnsi from "strip-ansi";
import {
  executeWithLogRequiringSuccess,
  getSanitizedEnv,
  type ExecPromise,
  RepoSettings,
  ExecAsyncException,
} from "../../utils";
import { Language } from "../../utils/settings";
import { dynamicImport } from "../../utils/dynamicImport";

// From package-name-regexp 3.0.0 (without importing the ESM module)
const packageNameRegex =
  /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

export const NEXT_JS_ENV = {
  NODE_ENV: "",
  NEXTAUTH_SECRET: "NEXTAUTH_SECRET",
  GITHUB_ID: "GITHUB_ID",
  GITHUB_SECRET: "GITHUB_SECRET",
  EMAIL_FROM: "EMAIL_FROM",
  EMAIL_SERVER_HOST: "EMAIL_SERVER_HOST",
  EMAIL_SERVER_PORT: "EMAIL_SERVER_PORT",
  EMAIL_SERVER_USER: "EMAIL_SERVER_USER",
  EMAIL_SERVER_PASSWORD: "EMAIL_SERVER_PASSWORD",
  DATABASE_URL: "file:./db.sqlite",
  NEXTAUTH_URL: "http://localhost:3000",
};

export const INSTALL_TIMEOUT = 5 * 60 * 1000; // 5 minutes
export const FORMAT_TIMEOUT = 2 * 60 * 1000; // 2 minutes
export const BUILD_TIMEOUT = 10 * 60 * 1000; // 10 minutes
export const TEST_TIMEOUT = 20 * 60 * 1000; // 20 minutes

export function getEnv(repoSettings?: RepoSettings) {
  return {
    ...getSanitizedEnv(),
    CI: "true",
    ...(typeof repoSettings?.env === "object"
      ? repoSettings.env
      : repoSettings?.packageDependencies?.next
      ? NEXT_JS_ENV
      : {}),
  };
}

export async function runBuildCheck(
  path: string,
  afterModifications: boolean,
  repoSettings?: RepoSettings,
): ExecPromise {
  const env = getEnv(repoSettings);
  const {
    installCommand = "npm install",
    formatCommand,
    language = Language.TypeScript,
    buildCommand,
    testCommand,
  } = repoSettings ?? {};

  // Used for all commands except installCommand
  const commandPrefix = repoSettings?.packageDependencies?.next
    ? "__NEXT_TEST_MODE=1 SKIP_ENV_VALIDATION=1 "
    : "";

  const baseBuildCommand =
    buildCommand ??
    `npm run build --verbose${
      language === Language.TypeScript ? " && npx tsc --noEmit" : ""
    }`;

  try {
    await executeWithLogRequiringSuccess(path, installCommand, {
      env,
      timeout: INSTALL_TIMEOUT,
    });
    if (afterModifications && formatCommand) {
      try {
        await executeWithLogRequiringSuccess(
          path,
          `${commandPrefix}${formatCommand}`,
          {
            env,
            timeout: FORMAT_TIMEOUT,
          },
        );
      } catch (error) {
        // There are a variety of reasons why the formatCommand might fail
        // so we choose to ignore those errors and continue with the build
        console.log(
          `Ignoring error running formatCommand: ${formatCommand}`,
          error,
        );
      }
    }
    const buildResult = await executeWithLogRequiringSuccess(
      path,
      `${commandPrefix}${baseBuildCommand}`,
      {
        env,
        timeout: BUILD_TIMEOUT,
      },
    );
    if (!testCommand) {
      return buildResult;
    }
    return await executeWithLogRequiringSuccess(
      path,
      `${commandPrefix}${testCommand}`,
      {
        env,
        timeout: TEST_TIMEOUT,
      },
    );
  } catch (error) {
    const { message, stdout, stderr } = error as ExecAsyncException;
    // Some tools (e.g. tsc) write to stdout instead of stderr
    // If we have an exception and stderr is empty, we should use stdout
    const output = stderr ? message : `${message}\n${stdout}`;

    // Awkward workaround to dynamically import an ESM module
    // within a commonjs TypeScript module

    // See Option #4 here: https://github.com/TypeStrong/ts-node/discussions/1290
    const stripAnsiFn = (await dynamicImport("strip-ansi"))
      .default as typeof stripAnsi;
    throw new Error(stripAnsiFn(output));
  }
}

export async function runNpmInstall(
  path: string,
  packageName: string,
  repoSettings?: RepoSettings,
) {
  const env = getEnv(repoSettings);
  const { installCommand = "npm install" } = repoSettings ?? {};

  // If we're trying to install multiple packages, first split them up and validate each one
  const packageNames = packageName.split(" ");
  for (const name of packageNames) {
    // do some quick validation to ensure the package name is valid and does not include an injection attack
    if (!packageNameRegex.test(name)) {
      throw new Error(`runNpmInstall: Invalid package name: ${name}`);
    }
  }
  const validatedPackageName = packageNames.join(" ");

  // TODO: do we need an addCommand in jacob.json to better handle this generically?
  const installCommandFirstPart = installCommand.split(" ")[0];
  const command = `${installCommandFirstPart} add`;
  return await executeWithLogRequiringSuccess(
    path,
    `${command} ${validatedPackageName}`,
    {
      env,
      timeout: INSTALL_TIMEOUT,
    },
  );
}
