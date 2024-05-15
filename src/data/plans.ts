import { type Plan } from "~/server/api/routers/events";
import { TaskType, TaskSubType } from "~/server/db/enums";

export const CREATE_NEW_FILE_PLAN: Plan[] = [
  {
    id: "0",
    type: TaskType.plan,
    title: "Create GitHub Issue",
    description: "Create a new GitHub issue to track the progress of the task.",
    position: 0,
    isComplete: false,
  },
  {
    id: "1",
    type: TaskType.plan,
    title: "Clone & Init Repo",
    description:
      "Clone the repository from the remote source and ensure the code builds.",
    position: 1,
    isComplete: false,
  },
  {
    id: "2",
    type: TaskType.plan,
    title: "Plan & Write Code",
    description: "Create a plan for the code and start the code writing phase.",
    position: 2,
    isComplete: false,
  },
  {
    id: "3",
    type: TaskType.plan,
    title: "Create PR",
    description: "Create a Pull Request to start the code review process.",
    position: 3,
    isComplete: false,
  },
  {
    id: "4",
    type: TaskType.plan,
    title: "Create Story",
    description: "Create a Storybook story for visual testing (optional).",
    position: 4,
    isComplete: false,
  },
  {
    id: "5",
    type: TaskType.plan,
    title: "Task Complete",
    description:
      "All code and optional stories have been written and the PR is ready for review.",
    position: 5,
    isComplete: false,
  },
];
const EDIT_FILES_PLAN: Plan[] = [
  {
    id: "0",
    type: TaskType.plan,
    title: "Create GitHub Issue",
    description: "Create a new GitHub issue to track the progress of the task.",
    position: 0,
    isComplete: false,
  },
  {
    id: "1",
    type: TaskType.plan,
    title: "Clone Repo",
    description:
      "Clone the repository from the remote source to your local machine.",
    position: 1,
    isComplete: false,
  },
  {
    id: "2",
    type: TaskType.plan,
    title: "Create Plan",
    description: "Generates a plan for the coding task.",
    position: 2,
    isComplete: false,
  },
  {
    id: "3",
    type: TaskType.plan,
    title: "Edit Code",
    description: "Triggers the code editing phase.",
    position: 3,
    isComplete: false,
  },
  {
    id: "4",
    type: TaskType.plan,
    title: "Verify Build",
    description:
      "Checks the build for any issues or errors and verifies its successful completion.",
    position: 4,
    isComplete: false,
  },
  {
    id: "5",
    type: TaskType.plan,
    title: "Create Pull Request",
    description: "Start the code review process for quality assurance.",
    position: 5,
    isComplete: false,
  },
  {
    id: "6",
    type: TaskType.plan,
    title: "Create Story (optional)",
    description:
      "Initiates the creation of Storybook stories for visual testing.",
    position: 6,
    isComplete: false,
  },
  {
    id: "7",
    type: TaskType.plan,
    title: "Task Complete",
    description:
      "All code and stories have been edited and the PR is ready for review.",
    position: 7,
    isComplete: false,
  },
];
const CODE_REVIEW_PLAN: Plan[] = [
  {
    id: "0",
    type: TaskType.plan,
    title: "Clone Repo",
    description:
      "Clone the repository from the remote source to your local machine.",
    position: 0,
    isComplete: false,
  },
  {
    id: "1",
    type: TaskType.plan,
    title: "Code Review",
    description: "Review the code changes submitted in the pull request.",
    position: 1,
    isComplete: false,
  },
  {
    id: "2",
    type: TaskType.plan,
    title: "Approve Changes",
    description: "Approve the changes made in the pull request.",
    position: 2,
    isComplete: false,
  },
  {
    id: "3",
    type: TaskType.plan,
    title: "Merge Pull Request",
    description: "Merge the changes into the main branch.",
    position: 3,
    isComplete: false,
  },
];
export const PLANS = {
  [TaskSubType.CREATE_NEW_FILE]: CREATE_NEW_FILE_PLAN,
  [TaskSubType.EDIT_FILES]: EDIT_FILES_PLAN,
  [TaskSubType.CODE_REVIEW]: CODE_REVIEW_PLAN,
};
