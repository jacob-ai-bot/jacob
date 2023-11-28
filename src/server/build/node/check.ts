import {
  executeWithLogRequiringSuccess,
  getSanitizedEnv,
  type ExecPromise,
} from "../../utils";

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

export async function runBuildCheck(path: string): ExecPromise {
  const env = {
    ...getSanitizedEnv(),
    ...NEXT_JS_ENV,
  };
  await executeWithLogRequiringSuccess(path, "npm install", { env });
  await executeWithLogRequiringSuccess(path, "npm run build --verbose", {
    env,
  });
  return executeWithLogRequiringSuccess(path, "npm run lint", { env });
}

export async function runNpmInstall(path: string, packageName: string) {
  // do some quick validation to ensure the package name is valid and does not include an injection attack
  if (!packageNameRegex.test(packageName)) {
    // This regex matches any word character or dash
    throw new Error(`runNpmInstall: Invalid package name: ${packageName}`);
  }
  return executeWithLogRequiringSuccess(path, `npm install ${packageName}`);
}
