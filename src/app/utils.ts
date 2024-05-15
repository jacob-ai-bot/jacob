import { TaskType } from "~/server/db/enums";
import { type Message, Role, SpecialPhrases, SidebarIcon } from "~/types";

export const statusStyles = {
  open: "bg-green-700 text-white px-2 py-1 rounded-full text-xs whitespace-nowrap ml-2",
  closed:
    "bg-red-700 text-white px-2 py-1 rounded-full text-xs whitespace-nowrap ml-2",
  merged:
    "bg-purple-700 text-white px-2 py-1 rounded-full text-xs whitespace-nowrap ml-2",
};

// The snapshot url of a Figma design might be found in the issue body. If so, we want to extract it.
// Here is the specific format that a snapshot url will be in:  \`\`\`![snapshot](${snapshotUrl})\`\`\``
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
  const messageWithIssue = messages
    .filter(
      (m) =>
        m.role === Role.ASSISTANT &&
        !Object.values(SpecialPhrases).some((phrase) =>
          m.content.includes(phrase),
        ),
    )
    .reverse()
    .find((message) => message?.content.includes("```"));

  if (!messageWithIssue) return null;

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
    case TaskType.task:
      return SidebarIcon.Plan;
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
      return SidebarIcon.Plan;
  }
};
