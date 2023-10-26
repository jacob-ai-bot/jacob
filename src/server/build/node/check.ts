import { execAsyncWithLog } from "../../utils";

export async function runBuildCheck(path: string): Promise<void> {
  const nodeVersionCommand = `node --version`;
  console.log(`Exec: ${nodeVersionCommand} cwd: ${path}`);
  await execAsyncWithLog(nodeVersionCommand, { cwd: path });

  const npmVersionCommand = `npm --version`;
  console.log(`Exec: ${npmVersionCommand} cwd: ${path}`);
  await execAsyncWithLog(npmVersionCommand, { cwd: path });
}
