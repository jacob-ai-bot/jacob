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
  if (formatCommand) {
    await executeWithLogRequiringSuccess(path, formatCommand, { env });
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
  // do some quick validation to ensure the package name is valid and does not include an injection attack
  if (!packageNameRegex.test(packageName)) {
    // This regex matches any word character or dash
    throw new Error(`runNpmInstall: Invalid package name: ${packageName}`);
  }
  // TODO: do we need an addCommand in jacob.json to better handle this generically?
  const command = installCommand.startsWith("yarn")
    ? "yarn add"
    : installCommand;
  return executeWithLogRequiringSuccess(path, `${command} ${packageName}`, {
    env,
  });
}
