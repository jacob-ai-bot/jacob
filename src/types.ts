export enum Role {
  ASSISTANT = "assistant",
  SYSTEM = "system",
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

export enum Language {
  TypeScript = "TypeScript",
  JavaScript = "JavaScript",
  Python = "Python",
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

export enum ResearchAgentActionType {
  ResearchCodebase = "ResearchCodebase",
  ResearchInternet = "ResearchInternet",
  AskProjectOwner = "AskProjectOwner",
  ResearchComplete = "ResearchComplete",
}

export interface Research {
  id?: number;
  type: ResearchAgentActionType;
  question: string;
  answer: string;
  todoId: number;
  issueId: number;
}

export interface Repo {
  id: number;
  node_id: string;
  full_name: string;
  org: string | undefined;
  repo: string | undefined;
  description: string | null;
  projectId: number | null;
  hasSettings: boolean;
}

export interface JiraBoard {
  expand: string;
  self: string;
  id: string;
  key: string;
  name: string;
  avatarUrls: string;
  projectTypeKey: string;
  simplified: boolean;
  style: string;
  isPrivate: boolean;
  properties: Record<string, unknown>;
  entityId: string;
  uuid: string;
}

export interface JiraAccessibleResource {
  id: string;
  url: string;
  name: string;
  scopes: string[];
  avatarUrl: string;
}

export interface JiraIssue {
  id: string;
  url: string;
  key: string;
  number: number;
  title: string;
  status: string;
  description: string;
  labels: string[];
  attachments: JiraAttachment[];
  ticketType: string;
}

export interface JiraAttachment {
  self: string;
  id: string;
  filename: string;
  author: {
    self: string;
    accountId: string;
    emailAddress: string;
    avatarUrls: Record<string, string>;
    displayName: string;
    active: boolean;
    timeZone: string;
    accountType: string;
  };
  created: string;
  size: number;
  mimeType: string;
  content: string;
  thumbnail: string;
}

export interface LinearTeam {
  id: string;
  name: string;
}

export interface LinearIssue {
  id: string;
  url: string;
  number: number;
  title: string;
  description: string;
  status: string;
}

export interface LinearIssueData {
  id: string;
  title: string;
  description?: string;
  teamId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LinearWebhookPayload {
  action: "create" | "update" | "remove";
  type: string;
  data: LinearIssueData;
  url: string;
  webhookTimestamp: number;
  webhookId: string;
}

export enum EvaluationMode {
  FASTER = "Faster Evaluation",
  DETAILED = "Detailed Evaluation",
}

export enum IssueBoardSource {
  GITHUB = "GitHub",
  JIRA = "Jira",
  LINEAR = "Linear",
}
