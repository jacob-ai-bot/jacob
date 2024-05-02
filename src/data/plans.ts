import { type Plan, TaskType } from "~/types";

export const CREATE_NEW_FILE_PLAN: Plan[] = [
  {
    id: "0",
    title: "Create GitHub Issue",
    description: "Create a new GitHub issue to track the progress of the task.",
    position: 0,
    isComplete: false,
  },
  {
    id: "1",
    title: "Clone & Init Repo",
    description:
      "Clone the repository from the remote source and ensure the code builds.",
    position: 1,
    isComplete: false,
  },
  {
    id: "2",
    title: "Plan & Write Code",
    description: "Create a plan for the code and start the code writing phase.",
    position: 2,
    isComplete: false,
  },
  {
    id: "3",
    title: "Create PR",
    description: "Create a Pull Request to start the code review process.",
    position: 3,
    isComplete: false,
  },
  {
    id: "4",
    title: "Create Story",
    description: "Create a Storybook story for visual testing (optional).",
    position: 4,
    isComplete: false,
  },
  {
    id: "5",
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
    title: "Create GitHub Issue",
    description: "Create a new GitHub issue to track the progress of the task.",
    position: 0,
    isComplete: false,
  },
  {
    id: "1",
    title: "Clone Repo",
    description:
      "Clone the repository from the remote source to your local machine.",
    position: 1,
    isComplete: false,
  },
  {
    id: "2",
    title: "Create Plan",
    description: "Generates a plan for the coding task.",
    position: 2,
    isComplete: false,
  },
  {
    id: "3",
    title: "Edit Code",
    description: "Triggers the code editing phase.",
    position: 3,
    isComplete: false,
  },
  {
    id: "4",
    title: "Verify Build",
    description:
      "Checks the build for any issues or errors and verifies its successful completion.",
    position: 4,
    isComplete: false,
  },
  {
    id: "5",
    title: "Create Pull Request",
    description: "Start the code review process for quality assurance.",
    position: 5,
    isComplete: false,
  },
  {
    id: "6",
    title: "Create Story (optional)",
    description:
      "Initiates the creation of Storybook stories for visual testing.",
    position: 6,
    isComplete: false,
  },
  {
    id: "7",
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
    title: "Clone Repo",
    description:
      "Clone the repository from the remote source to your local machine.",
    position: 0,
    isComplete: false,
  },
  {
    id: "1",
    title: "Code Review",
    description: "Review the code changes submitted in the pull request.",
    position: 1,
    isComplete: false,
  },
  {
    id: "2",
    title: "Approve Changes",
    description: "Approve the changes made in the pull request.",
    position: 2,
    isComplete: false,
  },
  {
    id: "3",
    title: "Merge Pull Request",
    description: "Merge the changes into the main branch.",
    position: 3,
    isComplete: false,
  },
];
export const PLANS = {
  [TaskType.CREATE_NEW_FILE]: CREATE_NEW_FILE_PLAN,
  [TaskType.EDIT_FILES]: EDIT_FILES_PLAN,
  [TaskType.CODE_REVIEW]: CODE_REVIEW_PLAN,
};
