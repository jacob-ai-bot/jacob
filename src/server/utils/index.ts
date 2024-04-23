import { dedent } from "ts-dedent";
import fs from "fs";
import path from "path";

import { exec, type ExecException } from "child_process";
import { promisify } from "util";
import { type RepoSettings, Language, Style } from "./settings";

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
      ${instructionsLanguage}
      ${instructionsStyle}
      ${snapshotInstructions}
    `.trim();
}

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

  promise.child.stdout?.on("data", (d) => {
    if (typeof d === "string" || d instanceof Uint8Array) {
      process.stdout.write(d);
    }
  });
  promise.child.stderr?.on("data", (d) => {
    if (typeof d === "string" || d instanceof Uint8Array) {
      process.stderr.write(d);
    }
  });
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
    env: getSanitizedEnv() as NodeJS.ProcessEnv,
    ...options,
  });
}

export const extractFilePathWithArrow = (title?: string) => {
  if (!title) return null;
  const regex = /=>\s*(.+)/; // This regex matches "=>" followed by optional spaces and a file name with an extension
  const match = title.match(regex);

  return match ? match[1]?.trim() : null;
};

export enum PRCommand {
  FixError = "@jacob-ai-bot fix error",
  CreateStory = "@jacob-ai-bot create story",
  CodeReview = "@jacob-ai-bot code review",
}

export const PR_COMMAND_VALUES = Object.values(PRCommand);

export function enumFromStringValue<T>(
  enm: Record<string, T>,
  value?: string,
): T | undefined {
  return value && (Object.values(enm) as unknown as string[]).includes(value)
    ? (value as unknown as T)
    : undefined;
}

export function removeMarkdownCodeblocks(text: string) {
  return (
    text
      .split("\n")
      // Filter out lines that start with optional whitespace followed by ```
      // Explanation of the regex:
      // ^ - Matches the start of a line
      // \s* - Matches zero or more whitespace characters
      // ``` - Matches the literal string ```
      .filter((line) => !line.match(/^\s*```/))
      .join("\n")
  );
}

// The snapshot url of a Figma design might be found in the issue body. If so, we want to extract it.
// Here is the specific format that a snapshot url will be in:  \`\`\`![snapshot](${snapshotUrl})\`\`\``
// This function will extract the snapshotUrl from the issue body
export function getSnapshotUrl(
  issueBody: string | null | undefined,
): string | undefined {
  if (!issueBody) return undefined;
  const regex = /\[snapshot\]\((.+)\)/;
  const match = issueBody.match(regex);
  return match ? match[1]?.trim() : undefined;
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
