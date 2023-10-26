import { execAsyncWithLog } from "../../utils";

type ExecPromise = ReturnType<typeof execAsyncWithLog>;

async function executeWithLogRequiringSuccess(
  path: string,
  command: string,
): ExecPromise {
  console.log(`Exec: ${command} cwd: ${path}`);
  const result = await execAsyncWithLog(command, { cwd: path });

  if (result.exitCode !== 0) {
    throw new Error(`${command} failed with exit code: ${result.exitCode}`);
  }

  return result;
}

export async function runBuildCheck(path: string): ExecPromise {
  await executeWithLogRequiringSuccess(path, "node --version");
  return await executeWithLogRequiringSuccess(path, "npm --version");
  //   await executeWithLogRequiringSuccess(path, "npm install");
  //   return await executeWithLogRequiringSuccess(path, "npm run build --verbose");
}
