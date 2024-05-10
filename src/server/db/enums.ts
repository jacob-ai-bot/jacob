export enum TaskType {
  task = "task",
  code = "code",
  design = "design",
  terminal = "terminal",
  plan = "plan",
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
}

export enum TaskSubType {
  CREATE_NEW_FILE = "Create New File",
  EDIT_FILES = "Edit Files",
  CODE_REVIEW = "Code Review",
}
