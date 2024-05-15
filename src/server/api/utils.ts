import { Octokit } from "@octokit/rest";
import { TaskSubType, TaskType } from "../db/enums";
import { type Plan } from "~/server/api/routers/events";
import { PLANS } from "~/data/plans";
import { type Issue } from "./routers/events";

export const getAllRepos = async (accessToken: string) => {
  const octokit = new Octokit({ auth: accessToken });
  const {
    data: { installations },
  } = await octokit.rest.apps.listInstallationsForAuthenticatedUser();
  const repoLists = await Promise.all(
    installations.map(async (installation) => {
      const {
        data: { repositories },
      } = await octokit.rest.apps.listInstallationReposForAuthenticatedUser({
        installation_id: installation.id,
      });
      return repositories.map(({ id, node_id, full_name }) => ({
        id,
        node_id,
        full_name,
      }));
    }),
  );
  return repoLists.flat();
};

export const getIssue = async (
  org: string,
  repo: string,
  issueNumber: number,
  accessToken: string,
) => {
  const octokit = new Octokit({ auth: accessToken });
  const { data: issueData } = await octokit.rest.issues.get({
    owner: org,
    repo,
    issue_number: issueNumber,
  });
  if (!issueData) {
    throw new Error("Issue not found");
  }
  const issue = {
    type: TaskType.issue,
    id: issueData.node_id,
    issueId: issueData.number,
    title: issueData.title,
    description: issueData.body ?? "",
    createdAt: issueData.created_at,
    comments: [],
    author: issueData.user?.login ?? "",
    assignee: issueData.assignee?.login ?? "",
    status: issueData.state,
    link: issueData.html_url,
  } as Issue;
  return issue;
};

export const validateRepo = async (
  org: string,
  repo: string,
  accessToken: string,
) => {
  const repositories = await getAllRepos(accessToken);
  const repos = repositories.map((r) => r.full_name);
  if (!repos.includes(`${org}/${repo}`)) {
    throw new Error("Invalid repo");
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
