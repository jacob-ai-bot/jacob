import { execAsyncWithLog } from "../../utils";

type ExecPromise = ReturnType<typeof execAsyncWithLog>;

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

async function executeWithLogRequiringSuccess(
  path: string,
  command: string,
): ExecPromise {
  console.log(`*:${command} (cwd: ${path})`);
  const {
    NODE_ENV, // eslint-disable-line @typescript-eslint/no-unused-vars
    GITHUB_PRIVATE_KEY, // eslint-disable-line @typescript-eslint/no-unused-vars
    GITHUB_APP_ID, // eslint-disable-line @typescript-eslint/no-unused-vars
    GITHUB_CLIENT_ID, // eslint-disable-line @typescript-eslint/no-unused-vars
    GITHUB_CLIENT_SECRET, // eslint-disable-line @typescript-eslint/no-unused-vars
    GITHUB_WEBHOOK_SECRET, // eslint-disable-line @typescript-eslint/no-unused-vars
    OPENAI_API_KEY, // eslint-disable-line @typescript-eslint/no-unused-vars
    DATABASE_URL, // eslint-disable-line @typescript-eslint/no-unused-vars
    VITE_GITHUB_CLIENT_ID, // eslint-disable-line @typescript-eslint/no-unused-vars
    VITE_FIGMA_PLUGIN_ID, // eslint-disable-line @typescript-eslint/no-unused-vars
    ...baseEnv
  } = process.env;
  const result = await execAsyncWithLog(command, {
    cwd: path,
    env: { ...baseEnv, ...NEXT_JS_ENV },
  });

  if (result.exitCode !== 0) {
    throw new Error(`${command} failed with exit code: ${result.exitCode}`);
  }

  return result;
}

export async function runBuildCheck(path: string): ExecPromise {
  await executeWithLogRequiringSuccess(path, "node --version");
  await executeWithLogRequiringSuccess(path, "npm --version");
  return await executeWithLogRequiringSuccess(path, "npm install");
  //   return await executeWithLogRequiringSuccess(path, "npm run build --verbose");
}
