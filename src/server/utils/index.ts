import fs from "fs";
import path from "path";
import { exec, ExecException } from "child_process";
import { promisify } from "util";

export type TemplateParams = {
  [key: string]: string;
};

// Usage example
// const agent = 'dev';
// const action = 'new_issue';
// const type = 'message';
// const params: TemplateParams = {
//   userName: 'John',
//   issueTitle: 'Bug in code'
// };

export const parseTemplate = (
  agent: string,
  action: string,
  type: string,
  params: TemplateParams,
): string => {
  // Get the folder path from the environment variable
  const folder = process.env.PROMPT_FOLDER;
  if (!folder) {
    throw new Error(`Environment variable PROMPT_FOLDER is not set`);
  }

  // Construct the file path
  const filePath = path.join(folder, `${agent}.${action}.${type}.txt`);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  // Read the file content
  let content = fs.readFileSync(filePath, "utf-8");

  // Extract variables from the content
  const matches = content.match(/\$\{(\w+)\}/g);
  if (matches) {
    const requiredVariables: string[] = [];

    // Replace each variable
    matches.forEach((match) => {
      const variableName = match.slice(2, -1);
      if (params[variableName] !== undefined) {
        content = content.replace(match, params[variableName]);
      } else {
        requiredVariables.push(variableName);
      }
    });

    // Throw an error if any required variables are missing
    if (requiredVariables.length > 0) {
      throw new Error(
        `Missing required variables: ${requiredVariables.join(", ")}`,
      );
    }
  }

  return content;
};

const execAsync = promisify(exec);

export interface ExecAsyncException extends ExecException {
  stdout: string;
  stderr: string;
}

export async function execAsyncWithLog(
  command: string,
  options: Parameters<typeof execAsync>[1],
) {
  const promise = execAsync(command, options);

  promise.child.stdout?.on("data", (d) => process.stdout.write(d));
  promise.child.stderr?.on("data", (d) => process.stderr.write(d));
  promise.child.on("close", (code) => console.log(`*:EXIT:${code}`));

  return promise;
}

export function getSanitizedEnv() {
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
  return baseEnv;
}

export type ExecPromise = ReturnType<typeof execAsyncWithLog>;

export async function executeWithLogRequiringSuccess(
  path: string,
  command: string,
  options?: Parameters<typeof execAsync>[1],
): ExecPromise {
  console.log(`*:${command} (cwd: ${path})`);
  return execAsyncWithLog(command, {
    cwd: path,
    env: getSanitizedEnv(),
    ...options,
  });
}

export const extractFilePathWithArrow = (title?: string) => {
  if (!title) return null;
  const regex = /=>\s*(.+)/; // This regex matches "=>" followed by optional spaces and a file name with an extension
  const match = title.match(regex);

  return match ? match[1]?.trim() : null;
};

export const todayAsString = () => {
  const today = new Date();
  const todayFormatted = `${(today.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${today
    .getDate()
    .toString()
    .padStart(2, "0")}/${today.getFullYear()}`;
  return todayFormatted;
};

export enum PRCommand {
  FixBuildError = "@jacob fix build error",
  CreateStory = "@jacob create story",
  CodeReview = "@jacob code review",
}

export const PR_COMMAND_VALUES = Object.values(PRCommand);

export function enumFromStringValue<T>(
  enm: { [s: string]: T },
  value?: string,
): T | undefined {
  return value && (Object.values(enm) as unknown as string[]).includes(value)
    ? (value as unknown as T)
    : undefined;
}
