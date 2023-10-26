import { execAsyncWithLog } from "../../utils";

type ExecPromise = ReturnType<typeof execAsyncWithLog>;

async function executeWithLogRequiringSuccess(
  path: string,
  command: string,
): ExecPromise {
  console.log(`*:${command} (cwd: ${path})`);
  const result = await execAsyncWithLog(command, { cwd: path });

  if (result.exitCode !== 0) {
    throw new Error(`${command} failed with exit code: ${result.exitCode}`);
  }

  return result;
}

export async function runBuildCheck(path: string): ExecPromise {
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  try {
    await executeWithLogRequiringSuccess(path, "asdf --version");
  } catch (error) {
    console.error(error);
  }
  await executeWithLogRequiringSuccess(path, "node --version");
  await executeWithLogRequiringSuccess(path, "npm --version");
  await executeWithLogRequiringSuccess(path, "npm install");
  return await executeWithLogRequiringSuccess(path, "npm run build --verbose");
}
