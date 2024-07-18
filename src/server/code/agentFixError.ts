import { type Issue, type Repository } from "@octokit/webhooks-types";
import { type Endpoints } from "@octokit/types";
import { dedent } from "ts-dedent";

import { db } from "~/server/db/db";
import { getImages, getTypes } from "../analyze/sourceMap";
import { traverseCodebase } from "../analyze/traverse";
import {
  type RepoSettings,
  type BaseEventData,
  extractIssueNumberFromBranchName,
  getStyles,
} from "../utils";
import { checkAndCommit } from "./checkAndCommit";
import { addCommentToIssue, getIssue } from "../github/issue";
import fixBugs, { type ProjectContext } from "~/server/agent/bugfix";

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

export async function fixError(params: AgentFixErrorParams) {
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
    body?.match(/Attempt\s+Number\s+(\d+)/)?.[1] ?? "1",
    10,
  );

  const sourceMap = traverseCodebase(rootPath)?.join("\n") ?? "";

  //   const research = await researchIssue(issueText, sourceMap, rootPath);

  const types = getTypes(rootPath, repoSettings);
  const packages = Object.keys(repoSettings?.packageDependencies ?? {}).join(
    "\n",
  );
  const styles = await getStyles(rootPath, repoSettings);
  const images = await getImages(rootPath, repoSettings);

  // Fetch research data from the database based on the issue ID
  const researchData = await db.research
    .where({ issueId: issue?.number })
    .all();

  // Convert the fetched research data into a string of question/answers
  const research = researchData
    .map((item) => `Question: ${item.question}\nAnswer: ${item.answer}`)
    .join("\n\n");

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
    types,
    packages,
    styles,
    images,
    research,
  };

  try {
    const fixes = await fixBugs(projectContext);

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
      buildErrorAttemptNumber: isNaN(attemptNumber) ? 1 : attemptNumber,
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
