import {
  executeWithLogRequiringSuccess,
  getSanitizedEnv,
  type ExecPromise,
  RepoSettings,
} from "../../utils";
import { Language } from "../../utils/settings";

// From package-name-regexp 3.0.0 (without importing the ESM module)
const packageNameRegex =
  /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

const NEXT_JS_ENV = {
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

export async function runBuildCheck(
  path: string,
  afterModifications: boolean,
  repoSettings?: RepoSettings,
): ExecPromise {
  const env = {
    ...getSanitizedEnv(),
    ...(repoSettings?.env ?? NEXT_JS_ENV),
  };
  const {
    installCommand = "npm install",
    formatCommand,
    language = Language.TypeScript,
    buildCommand,
  } = repoSettings ?? {};

  const realBuildCommand =
    buildCommand ??
    `__NEXT_TEST_MODE=1 npm run build --verbose${
      language === Language.TypeScript ? "; npx tsc --noEmit" : ""
    }`;

  await executeWithLogRequiringSuccess(path, installCommand, { env });
  if (afterModifications && formatCommand) {
    try {
      await executeWithLogRequiringSuccess(path, formatCommand, { env });
    } catch (error) {
      // There are a variety of reasons why the formatCommand might fail
      // so we choose to ignore those errors and continue with the build
      console.log(
        `Ignoring error running formatCommand: ${formatCommand}`,
        error,
      );
    }
  }
  return executeWithLogRequiringSuccess(path, realBuildCommand, {
    env,
  });
}
export async function runNpmInstall(
  path: string,
  packageName: string,
  repoSettings?: RepoSettings,
) {
  const env = {
    ...getSanitizedEnv(),
    ...(repoSettings?.env ?? NEXT_JS_ENV),
  };
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
  const command = installCommand.startsWith("yarn")
    ? "yarn add"
    : installCommand;
  return await executeWithLogRequiringSuccess(
    path,
    `${command} ${validatedPackageName}`,
    {
      env,
    },
  );
}
