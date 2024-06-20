import { Octokit } from "@octokit/rest";
import { TaskType } from "../db/enums";
import { type Issue } from "./routers/events";
import { getRepoSettings, parseTemplate } from "../utils";
import { sendGptRequestWithSchema } from "../openai/request";
import {
  type ExtractedIssueInfo,
  ExtractedIssueInfoSchema,
} from "../code/extractedIssue";
import { cloneRepo } from "../git/clone";
import { getSourceMap } from "../analyze/sourceMap";
import { traverseCodebase } from "../analyze/traverse";

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

export const getExtractedIssue = async (
  sourceMap: string,
  issueText: string,
) => {
  const extractedIssueTemplateParams = {
    sourceMap,
    issueText,
  };

  const extractedIssueSystemPrompt = parseTemplate(
    "dev",
    "extracted_issue",
    "system",
    extractedIssueTemplateParams,
  );
  const extractedIssueUserPrompt = parseTemplate(
    "dev",
    "extracted_issue",
    "user",
    extractedIssueTemplateParams,
  );
  const extractedIssue = (await sendGptRequestWithSchema(
    extractedIssueUserPrompt,
    extractedIssueSystemPrompt,
    ExtractedIssueInfoSchema,
    0.2,
  )) as ExtractedIssueInfo;
  return extractedIssue;
};

export const cloneAndGetSourceMap = async (
  repo: string,
  accessToken: string,
): Promise<string> => {
  let cleanupClone: (() => Promise<void>) | undefined;
  try {
    const { path, cleanup } = await cloneRepo({
      repoName: repo,
      token: accessToken,
    });
    cleanupClone = cleanup;

    const repoSettings = getRepoSettings(path);
    const sourceMap =
      getSourceMap(path, repoSettings) || (await traverseCodebase(path));
    return sourceMap;
  } finally {
    if (cleanupClone) {
      await cleanupClone();
    }
  }
};
