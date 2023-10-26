import fs from "fs";
import path from "path";
import { exec } from "child_process";
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

export async function execAsyncWithLog(
  command: string,
  options: Parameters<typeof execAsync>[1],
) {
  const promise = execAsync(command, options);

  promise.child.stdout?.on("data", (d) => process.stdout.write(d));
  promise.child.stderr?.on("data", (d) => process.stderr.write(d));
  promise.child.on("close", (code) => console.log(`*:EXIT:${code}`));

  await promise;

  return promise.child;
}
