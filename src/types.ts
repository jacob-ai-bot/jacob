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
  type: ResearchAgentActionType;
  question: string;
  answer: string;
  issueId: number;
}
