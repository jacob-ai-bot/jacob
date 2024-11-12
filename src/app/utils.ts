import { PLANS } from "~/data/plans";
import { type Plan } from "~/server/api/routers/events";
import {
  TaskStatus,
  TaskSubType,
  TaskType,
  TodoStatus,
} from "~/server/db/enums";
import { type StandardizedPath } from "~/server/utils/files";
import { type Message, Role, SpecialPhrases, SidebarIcon } from "~/types";
import pathBrowserify from "path-browserify";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const statusStyles = {
  open: "bg-github-green text-white px-2 py-1 rounded-full text-xs whitespace-nowrap ml-2",
  closed:
    "bg-red-700 text-white px-2 py-1 rounded-full text-xs whitespace-nowrap ml-2",
  merged:
    "bg-purple-700 text-white px-2 py-1 rounded-full text-xs whitespace-nowrap ml-2",
};

// The snapshot url of a Figma design might be found in the issue body. If so, we want to extract it.
// Here is the specific format that a snapshot url will be in:  ```![snapshot](${snapshotUrl})```
// This function will extract the snapshotUrl from the issue body
export const getSnapshotUrl = (
  issueBody: string | null | undefined,
): string | undefined => {
  if (!issueBody) return undefined;
  const regex = /\[snapshot\]\((.+)\)/;
  const match = issueBody.match(regex);
  return match ? match[1]?.trim() : undefined;
};

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

export function getIssueDescriptionFromMessages(messages: Message[]) {
  // Issue descriptions are always contained in code blocks towards the end of the conversation
  // To find the issue description, get the most recent message from the assistant that is not a
  // special phrase and has a code block
  let messageWithIssue = messages
    .filter(
      (m) =>
        m.role === Role.ASSISTANT &&
        !Object.values(SpecialPhrases).some((phrase) =>
          m.content.includes(phrase),
        ),
    )
    .reverse()
    .find((message) => message?.content.includes("```"));

  if (!messageWithIssue) {
    messageWithIssue = messages
      .filter((m) => m.role === Role.ASSISTANT)
      .reverse()
      .find((message) => message?.content.includes("```"));
  }
  if (!messageWithIssue) {
    return null;
  }

  // find the first code block in the message
  const regex = /```(?:markdown)?(.*?)```/s;
  const match = messageWithIssue.content.match(regex);

  return match ? match[1] : null;
}

export const capitalize = (s: string): string => {
  if (typeof s !== "string") return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const getSidebarIconForType = (type: TaskType) => {
  switch (type) {
    case TaskType.command:
      return SidebarIcon.Terminal;
    case TaskType.issue:
      return SidebarIcon.Issues;
    case TaskType.prompt:
      return SidebarIcon.Prompts;
    case TaskType.code:
      return SidebarIcon.Code;
    case TaskType.pull_request:
      return SidebarIcon.PullRequests;
    default:
      console.error("Unknown task type: ", type);
      return SidebarIcon.Code;
  }
};

export const getPlanForTaskSubType = (taskSubType: TaskSubType) => {
  // set the plan
  let plan: Plan[] = [];
  switch (taskSubType) {
    case TaskSubType.CREATE_NEW_FILE:
      plan = PLANS[TaskSubType.CREATE_NEW_FILE];
      break;
    case TaskSubType.EDIT_FILES:
      plan = PLANS[TaskSubType.EDIT_FILES];
      break;
    case TaskSubType.CODE_REVIEW:
      plan = PLANS[TaskSubType.CODE_REVIEW];
      break;
    default:
      console.error("Unknown task type: ", taskSubType);
      break;
  }
  return plan;
};

export function isValidPath(path: string): boolean {
  return /^\/[a-zA-Z0-9_\-./[\]...]+$/.test(path);
}

export function standardizePath(filePath: string): StandardizedPath {
  if (!filePath) {
    return "" as StandardizedPath;
  }
  let cleanPath = filePath.replace(/^\.\//, "");
  if (!cleanPath) {
    return "" as StandardizedPath;
  }

  if (!cleanPath.startsWith("/")) {
    cleanPath = "/" + cleanPath;
  }

  cleanPath = pathBrowserify.posix.normalize(cleanPath);
  cleanPath = cleanPath.replace(/\\/g, "/");

  if (!isValidPath(cleanPath)) {
    console.log("Invalid file path:", filePath);
    console.log("Standardized path:", cleanPath);
    return "" as StandardizedPath;
  }

  return cleanPath as StandardizedPath;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTodoLabel(status: TodoStatus) {
  switch (status) {
    case TodoStatus.TODO:
      return "Todo";
    case TodoStatus.IN_PROGRESS:
      return "In Progress";
    case TodoStatus.DONE:
      return "Done";
    case TodoStatus.ERROR:
      return "Error";
  }
}

export function getTaskStatusLabel(status: TaskStatus) {
  switch (status) {
    case TaskStatus.TODO:
      return "Todo";
    case TaskStatus.IN_PROGRESS:
      return "In Progress";
    case TaskStatus.DONE:
      return "Review PR";
    case TaskStatus.ERROR:
      return "Error";
    case TaskStatus.CLOSED:
      return "Closed";
  }
}

export function getTaskStatusColor(status: TaskStatus) {
  switch (status) {
    case TaskStatus.TODO:
      return "bg-sunset-100 text-sunset-800 dark:bg-sunset-800 dark:text-sunset-100";
    case TaskStatus.IN_PROGRESS:
      return "bg-meadow-100 text-meadow-800 dark:bg-meadow-800 dark:text-meadow-100";
    case TaskStatus.DONE:
      return "bg-blossom-100 text-blossom-800 dark:bg-blossom-800 dark:text-blossom-100";
    case TaskStatus.ERROR:
      return "bg-error-100 text-error-800 dark:bg-error-800 dark:text-error-100";
    case TaskStatus.CLOSED:
      return "bg-closed text-slate-800 dark:bg-slate-800 dark:text-slate-100";
    default:
      return "";
  }
}

export function getLanguageFromFile(fileName: string): string {
  if (!fileName) return "";
  const extension = fileName.split(".").pop();
  let language = "";
  if (extension === "ts" || extension === "tsx") {
    language = "typescript";
  } else if (extension === "js" || extension === "jsx") {
    language = "javascript";
  } else if (
    extension === "py" ||
    extension === "py3" ||
    extension === "pyw" ||
    extension === "pyi"
  ) {
    language = "python";
  } else if (extension === "md" || extension === "mdx") {
    language = "markdown";
  } else if (extension === "json") {
    language = "json";
  } else if (extension === "txt") {
    language = "text";
  } else if (extension === "java") {
    language = "java";
  } else if (extension === "go") {
    language = "go";
  } else if (extension === "rs") {
    language = "rust";
  } else if (extension === "sh") {
    language = "bash";
  } else if (extension === "yml" || extension === "yaml") {
    language = "yaml";
  }
  return language;
}

export function startsWithIgnoreCase(str: string, prefix: string): boolean {
  if (!str || !prefix) return false;
  return str.toLowerCase().startsWith(prefix.toLowerCase());
}

export function includesIgnoreCase(
  str: string | null | undefined,
  searchString: string,
): boolean {
  if (!str || !searchString) return false;
  return str.toLowerCase().includes(searchString.toLowerCase());
}
