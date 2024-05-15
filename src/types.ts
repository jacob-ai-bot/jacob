export enum Role {
  ASSISTANT = "assistant",
  USER = "user",
}

export type Message = {
  role: Role;
  content: string;
};

export enum SpecialPhrases {
  CREATE_TASK = "<<CREATE_TASK>>",
  UPDATE_TASK = "<<UPDATE_TASK>>",
}

export enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  DONE = "done",
  ERROR = "error",
}

export enum TaskType {
  CREATE_NEW_FILE = "Create New File",
  EDIT_FILES = "Edit Files",
  CODE_REVIEW = "Code Review",
}

export type Task = {
  id: string;
  repo: string;
  name: string;
  type: TaskType;
  description: string;
  storyPoints: number;
  status: TaskStatus;
  imageUrl?: string;
  currentPlanStep?: number;
  statusDescription?: string;
  plan?: Plan[];
  issue?: Issue;
  pullRequest?: PullRequest;
  commands?: Command[];
  codeFiles?: CodeFile[];
  prompts?: PromptDetails[];
};

export type Command = {
  command: string;
  response: string;
  directory?: string;
};

export enum Language {
  TypeScript = "TypeScript",
  JavaScript = "JavaScript",
}

export type CodeFile = {
  fileName: string;
  filePath: string;
  language: Language;
  codeBlock: string;
};

export type Plan = {
  id: string;
  title: string;
  description: string;
  position: number;
  isComplete: boolean;
};

export enum SidebarIcon {
  None = "None",
  Code = "Code",
  Design = "Design",
  Terminal = "Terminal",
  Plan = "Plan",
  Prompts = "Prompts",
  Issues = "Issues",
  PullRequests = "Pull Requests",
}

export type Comment = {
  id: string;
  commentId: number;
  username: string;
  createdAt: string;
  content: string;
};

export type Issue = {
  id: string;
  issueId: number;
  title: string;
  description: string;
  createdAt: string;
  comments: Comment[];
  author: string;
  assignee: string;
  status: "open" | "closed";
  link: string;
  stepsToAddressIssue?: string | null;
  issueQualityScore?: number | null;
  commitTitle?: string | null;
  filesToCreate?: string[] | null;
  filesToUpdate?: string[] | null;
};

export type PullRequest = {
  id: string;
  pullRequestId: number;
  title: string;
  description: string;
  link: string;
  status: "open" | "closed" | "merged";
  createdAt: string;
  author: string;
  comments: Comment[];
  changedFiles: number;
  additions: number;
  deletions: number;
};

export type Prompt = {
  promptType: "User" | "System" | "Assistant";
  prompt: string;
  timestamp: string;
};

export type PromptDetails = {
  metadata: {
    timestamp: string;
    cost: number;
    tokens: number;
    duration: number;
    model: string;
  };
  request: {
    prompts: Prompt[];
  };
  response: {
    prompt: Prompt;
  };
};

export enum InternalEventType {
  Task = "Task",
  Code = "Code",
  Design = "Design",
  Command = "Command",
  Plan = "Plan",
  Prompt = "Prompt",
  Issue = "Issue",
  PullRequest = "Pull Request",
}

// This is the InternalEvent type from the otto-mvp repo
export type InternalEvent = {
  id?: string;
  type: InternalEventType;
  repo: string;
  issueId?: number | undefined;
  pullRequestId?: number | undefined;
  userId: string;
  payload:
    | Task
    | Plan
    | Issue
    | PullRequest
    | Command
    | CodeFile
    | PromptDetails;
};

export type NewIssue = {
  title: string;
  description: string;
  repo: string;
};

export enum Mode {
  EXISTING_ISSUES = "existing-issues",
  NEW_TASKS = "new-tasks",
  TEST_COVERAGE = "test-coverage",
  BUG_FIXES = "bug-fixes",
  CODE_REVIEWS = "code-reviews",
}

export type Developer = {
  id: string;
  name: string;
  location: string;
  imageUrl: string;
  bio: string;
  yearsOfExperience: number;
  mode: Mode;
  cta: string;
  personalityProfile: string;
  startingMessage: string;
};
