import {
  executeWithLogRequiringSuccess,
  getSanitizedEnv,
  type ExecPromise,
} from "../../utils";

const NEXT_JS_ENV = {
  NODE_ENV: "development",
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
  await executeWithLogRequiringSuccess(path, "node --version", { env });
  await executeWithLogRequiringSuccess(path, "npm --version", { env });
  await executeWithLogRequiringSuccess(path, "npm install", { env });
  return await executeWithLogRequiringSuccess(path, "npm run build --verbose", {
    env,
  });
}
