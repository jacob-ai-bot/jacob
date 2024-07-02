export enum TaskType {
  task = "task",
  code = "code",
  design = "design",
  terminal = "terminal",
  plan = "plan",
  plan_step = "plan step",
  prompt = "prompt",
  issue = "issue",
  pull_request = "pull request",
  command = "command",
}

export enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  DONE = "done",
  ERROR = "error",
  CLOSED = "closed",
}

export enum TodoStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  DONE = "done",
  ERROR = "error",
}

export enum PlanningAgentActionType {
  EditExistingCode = "EditExistingCode",
  CreateNewCode = "CreateNewCode",
}

export enum TaskSubType {
  CREATE_NEW_FILE = "Create New File",
  EDIT_FILES = "Edit Files",
  CODE_REVIEW = "Code Review",
}

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
}

export enum OnboardingStatus {
  NONE = "none",
  READY = "ready",
  DONE = "done",
}
