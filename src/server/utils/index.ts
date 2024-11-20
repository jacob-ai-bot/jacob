import { dedent } from "ts-dedent";
import fs from "fs";
import path from "path";

import { exec, type ExecException, type PromiseWithChild } from "child_process";
import { promisify } from "util";
import { Language } from "~/types";
import { type RepoSettings, Style } from "./settings";
import { emitCommandEvent } from "./events";
import { sendGptRequestWithSchema } from "../openai/request";
import { z } from "zod";

export { type RepoSettings, getRepoSettings } from "./settings";

export type TemplateParams = Record<string, string>;

// Usage example
// const agent = 'dev';
// const action = 'new_issue';
// const type = 'message';
// const params: TemplateParams = {
//   userName: 'John',
//   issueTitle: 'Bug in code'
// };
// const rootPath = '/tmp/user-code-repo/';

export interface BaseEventData {
  projectId: number;
  repoFullName: string;
  userId: string;
  issueId?: number;
  skipBuild?: boolean;
}

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

  // Read the template file content
  const template = fs.readFileSync(filePath, "utf-8");

  // Replace the parameters in the template
  return replaceParams(template, params);
};

const replaceParams = (content: string, params: TemplateParams) => {
  // Extract variables from the content
  const matches = content.match(/\$\{(\w+)\}/g);
  if (matches) {
    const requiredVariables: string[] = [];

    // Replace each variable
    matches.forEach((match) => {
      const variableName = match.slice(2, -1);
      const param = params[variableName];
      if (param !== undefined) {
        content = content.replace(match, param);
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

export function constructNewOrEditSystemPrompt(
  action: string,
  templateParams: TemplateParams,
  repoSettings?: RepoSettings,
) {
  const baseSystemPrompt = parseTemplate(
    "dev",
    "code_new_or_edit",
    "system",
    templateParams,
  );
  const specificInstructions = parseTemplate(
    "dev",
    action,
    "system",
    templateParams,
  );
  const instructionsDefault = parseTemplate(
    "dev",
    "code_new_or_edit",
    "default",
    templateParams,
  );
  let instructionsBackgroundInfo = "";
  if (templateParams.research) {
    instructionsBackgroundInfo = parseTemplate(
      "dev",
      "code_new_or_edit",
      "research",
      templateParams,
    );
  } else {
    const instructionsLanguage = parseTemplate(
      "dev",
      "code_new_or_edit",
      repoSettings?.language === Language.JavaScript
        ? "javascript"
        : "typescript",
      templateParams,
    );
    const instructionsStyle = parseTemplate(
      "dev",
      "code_new_or_edit",
      repoSettings?.style === Style.CSS ? "css" : "tailwind",
      templateParams,
    );
    instructionsBackgroundInfo = dedent`
      ${instructionsLanguage}
      ${instructionsStyle}
    `.trim();
  }
  let snapshotInstructions = "";
  if (templateParams.snapshotUrl) {
    snapshotInstructions = parseTemplate(
      "dev",
      "code_new_or_edit",
      "snapshot",
      templateParams,
    );
  }
  return dedent`
      ${baseSystemPrompt}
      ${specificInstructions}
      ${instructionsDefault}
      ${instructionsBackgroundInfo}
      ${snapshotInstructions}
    `.trim();
}

const execAsync = promisify(exec);

export interface ExecAsyncException extends ExecException {
  stdout: string;
  stderr: string;
}

interface PromiseWithChildAndResponse<T> extends PromiseWithChild<T> {
  response: string;
}

function execAsyncWithLog(
  command: string,
  options: Parameters<typeof execAsync>[1],
) {
  let response = "";
  const promise = execAsync(command, options) as PromiseWithChildAndResponse<{
    stdout: Buffer;
    stderr: Buffer;
  }>;

  promise.child.stdout?.on("data", (d) => {
    if (typeof d === "string" || d instanceof Uint8Array) {
      process.stdout.write(d);
      response += d.toString();
    }
  });
  promise.child.stderr?.on("data", (d) => {
    if (typeof d === "string" || d instanceof Uint8Array) {
      process.stderr.write(d);
      response += d.toString();
    }
  });
  promise.child.on("close", () => {
    // console.log(`*:EXIT:${code}`);
    promise.response = response;
  });

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
    ...baseEnv
  } = process.env;
  return baseEnv;
}

const BranchNameSchema = z.object({
  branchName: z.string().regex(/^[a-z0-9-]+$/, {
    message:
      "Branch name must only contain lowercase letters, numbers, and dashes",
  }),
});

export async function generateJacobBranchName(
  issueNumber: number,
  issueTitle?: string,
  issueBody?: string,
) {
  let branchName = "";

  if (issueTitle) {
    try {
      const prompt = `Generate a short, descriptive git branch name (max 3-4 words) based on this issue title: "${issueTitle}"${issueBody ? ` and description: "${issueBody}"` : ""}. Use only lowercase letters, numbers and dashes. No special characters or spaces.`;

      const systemPrompt = dedent`
        You are a helpful assistant that generates git branch names.
        You must respond with a JSON object containing a single "branchName" field.
        Your response must match the following schema:
        const BranchNameSchema = z.object({
            branchName: z.string().regex(/^[a-z0-9-]+$/) // Branch name must be a valid git branch!
        });
        The branch name must:
        - Only contain lowercase letters, numbers, and dashes
        - Be descriptive but concise (3-4 words max)
        - Not include any special characters or spaces
      `;

      const response = await sendGptRequestWithSchema(
        prompt,
        systemPrompt,
        BranchNameSchema,
        0.3,
        undefined,
        3,
        "gpt-4o-mini-2024-07-18",
      );

      if (response?.branchName) {
        branchName = response.branchName;
      }
    } catch (error) {
      console.error("Error generating branch name with LLM:", error);
    }
  }

  if (!branchName) {
    branchName = "jacob-issue";
  }

  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${branchName}-${issueNumber}-${randomDigits}`;
}

export function extractIssueNumberFromBranchName(branch: string) {
  const regex = /-(\d+)-\d+$/;
  const match = branch.match(regex);
  const issueNumber = parseInt(match?.[1] ?? "", 10);
  return isNaN(issueNumber) ? undefined : issueNumber;
}

export type ExecPromise = Promise<{
  stdout: string | Buffer;
  stderr: string | Buffer;
}>;

export interface ExecuteWithLogRequiringSuccessWithoutEventParams {
  directory: string;
  command: string;
  options?: Parameters<typeof execAsync>[1];
  shouldLog?: boolean;
}

export function executeWithLogRequiringSuccessWithoutEvent({
  directory,
  command,
  options,
  shouldLog = true,
}: ExecuteWithLogRequiringSuccessWithoutEventParams): ExecPromise {
  if (shouldLog) {
    console.log(`*:${command} (cwd: ${directory})`);
  }
  return execAsyncWithLog(command, {
    cwd: directory,
    env: getSanitizedEnv() as NodeJS.ProcessEnv,
    ...options,
  });
}

export type ExecuteWithLogRequiringSuccessParams =
  ExecuteWithLogRequiringSuccessWithoutEventParams & BaseEventData;

export function executeWithLogRequiringSuccess({
  directory,
  command,
  options,
  ...baseEventData
}: ExecuteWithLogRequiringSuccessParams): ExecPromise {
  console.log(`*:${command} (cwd: ${directory})`);
  const promise = execAsyncWithLog(command, {
    cwd: directory,
    env: getSanitizedEnv() as NodeJS.ProcessEnv,
    ...options,
  });
  return promise.finally(() => {
    void emitCommandEvent({
      ...baseEventData,
      directory,
      command: command.replace(/x-access-token:[^@]+@/g, ""),
      response: promise.response.replace(/x-access-token:[^@]+@/g, ""),
      exitCode: promise.child.exitCode,
    }).catch((e) => {
      console.error(
        `*:${command} (cwd: ${directory}) - Ignoring error emitting command event`,
        e,
      );
    });
  }) as ExecPromise;
}

export const extractFilePathWithArrow = (title?: string) => {
  if (!title) return null;
  const regex = /=>\s*(.+)/; // This regex matches "=>" followed by optional spaces and a file name with an extension
  const match = title.match(regex);

  return match ? match[1]?.trim() : null;
};

export const AT_MENTION = "@jacob-ai-bot";

export enum PRCommand {
  Build = `${AT_MENTION} build`,
  FixError = `${AT_MENTION} fix error`,
  CreateStory = `${AT_MENTION} create story`,
  CodeReview = `${AT_MENTION} code review`,
}

export const SKIP_BUILD = "--skip-build";
export const SKIP_DEBUGGING = "--skip-debugging";
export const SKIP_STORYBOOK = "--skip-storybook";
export const CUSTOM_BRANCH = "--branch";

export const PR_COMMAND_VALUES = Object.values(PRCommand);

export enum IssueCommand {
  Build = `${AT_MENTION} build`,
}

export const ISSUE_COMMAND_VALUES = Object.values(IssueCommand);

export function enumFromStringValue<T>(
  enm: Record<string, T>,
  value?: string,
): T | undefined {
  return value && (Object.values(enm) as unknown as string[]).includes(value)
    ? (value as unknown as T)
    : undefined;
}

export async function getStyles(rootPath: string, repoSettings?: RepoSettings) {
  const style = repoSettings?.style ?? Style.Tailwind;
  if (style === Style.Tailwind) {
    const language = repoSettings?.language ?? Language.TypeScript;
    const defaultTailwindConfig = `tailwind.config.${
      language === Language.JavaScript ? "js" : "ts"
    }`;
    const tailwindConfig =
      repoSettings?.directories?.tailwindConfig ?? defaultTailwindConfig;
    if (tailwindConfig) {
      const tailwindConfigPath = path.join(rootPath, tailwindConfig);
      if (fs.existsSync(tailwindConfigPath)) {
        try {
          return await fs.promises.readFile(tailwindConfigPath, "utf-8");
        } catch (e) {
          console.error("Error reading tailwind config", e);
        }
      }
    }
  }
  // TODO: Add CSS styles
  return "";
}

export function getLanguageFromFileName(filePath: string) {
  const extension = path.extname(filePath);
  switch (extension) {
    case ".ts":
    case ".tsx":
      return Language.TypeScript;
    case ".js":
    case ".jsx":
      return Language.JavaScript;
    case ".py":
    case ".py3":
    case ".pyw":
    case ".pyi":
      return Language.Python;
    default:
      return;
  }
}

export const capitalize = (s: string): string => {
  if (typeof s !== "string") return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Function to fetch the image and convert it to base64
export const fetchImageAsBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64Image = buffer.toString("base64");
  const contentType = response.headers.get("content-type");
  console.log("contentType: ", contentType);
  const mimeType = contentType ?? "application/octet-stream";
  return `data:${mimeType};base64,${base64Image}`;
};

export function rethrowErrorWithTokenRedacted(error: unknown, token: string) {
  // Throw this error, but with the token redacted from the message (as newError)
  // This prevents the actual token from being included in any github issue comments
  const originalError = error as ExecAsyncException;
  const message = originalError.message;
  const newMessage = message.replace(token, "<redacted>");
  const newError = new Error(newMessage);
  newError.name = originalError.name;
  newError.stack = originalError.stack;
  (newError as ExecAsyncException).cmd = originalError.cmd;
  (newError as ExecAsyncException).killed = originalError.killed;
  (newError as ExecAsyncException).code = originalError.code;
  (newError as ExecAsyncException).signal = originalError.signal;
  (newError as ExecAsyncException).stdout = originalError.stdout.replace(
    token,
    "<redacted>",
  );
  (newError as ExecAsyncException).stderr = originalError.stderr.replace(
    token,
    "<redacted>",
  );
  throw newError;
}
