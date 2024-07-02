import { type Issue, type Repository } from "@octokit/webhooks-types";
import { type Endpoints } from "@octokit/types";
import { dedent } from "ts-dedent";

import { getSourceMap } from "../analyze/sourceMap";
import { traverseCodebase } from "../analyze/traverse";
import {
  type RepoSettings,
  type BaseEventData,
  extractIssueNumberFromBranchName,
} from "../utils";
import { checkAndCommit } from "./checkAndCommit";
import { addCommentToIssue, getIssue } from "../github/issue";
import { fixError, type ProjectContext } from "~/server/utils/agent/bugfix";
import { runBuildCheck } from "../build/node/check";

export type PullRequest =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];
type RetrievedIssue =
  Endpoints["GET /repos/{owner}/{repo}/issues/{issue_number}"]["response"]["data"];

export interface AgentFixErrorParams extends BaseEventData {
  repository: Repository;
  token: string;
  prIssue: Issue | null;
  body: string | null;
  rootPath: string;
  branch: string;
  existingPr: PullRequest;
  repoSettings?: RepoSettings;
}

export async function agentFixError(params: AgentFixErrorParams) {
  const {
    repository,
    token,
    prIssue,
    body,
    rootPath,
    branch,
    repoSettings,
    existingPr,
    ...baseEventData
  } = params;
  const issueNumber = extractIssueNumberFromBranchName(branch);
  let issue: RetrievedIssue | undefined;
  if (issueNumber) {
    const result = await getIssue(repository, token, issueNumber);
    issue = result.data;
    console.log(
      `[${repository.full_name}] Loaded Issue #${issueNumber} associated with PR #${existingPr?.number}`,
    );
  } else {
    console.log(
      `[${repository.full_name}] No Issue associated with ${branch} branch for PR #${existingPr?.number}`,
    );
  }
  const attemptNumber = parseInt(
    body?.match(/Attempt\s+Number\s+(\d+)/)?.[1] ?? "",
    10,
  );
  let errors = "";
  try {
    await runBuildCheck({
      ...baseEventData,
      path: rootPath,
      afterModifications: true,
      repoSettings,
    });
    console.log("Build successful after fix");
  } catch (error) {
    errors = (error as Error).message;
    console.log("Build failed:", errors);
  }

  const sourceMap = await traverseCodebase(rootPath);

  //   const research = await researchIssue(issueText, sourceMap, rootPath);
  const research = ""; // TODO: currently this is part of the GitHub issue, need to separate it out

  const projectContext: ProjectContext = {
    repository,
    token,
    prIssue,
    body,
    rootPath,
    branch,
    existingPr,
    repoSettings,
    baseEventData,
    sourceMapOrFileList: sourceMap,
    research,
  };

  try {
    const fixes = await fixError(errors, projectContext);

    const commitMessage = `JACoB fix error: ${fixes?.join(",") ?? "Build error fix"}`;

    await checkAndCommit({
      ...baseEventData,
      repository,
      token,
      rootPath,
      branch,
      repoSettings,
      commitMessage,
      existingPr,
      issue,
      buildErrorAttemptNumber: attemptNumber + 1,
    });

    return fixes;
  } catch (error) {
    if (prIssue) {
      const message = dedent`JACoB here once again...

        Unfortunately, I wasn't able to resolve all the error(s).

        Here is some information about the error(s):
        
       ${error}

       This was my last attempt to fix the error(s). Please review the error(s) and try to fix them manually, or you may do a code review to provide additional information and I will try to fix the error(s) again.
      `;

      await addCommentToIssue(repository, prIssue.number, token, message);
    }
    throw error;
  }
}
