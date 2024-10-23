import { dedent } from "ts-dedent";
import { type Issue, type Repository } from "@octokit/webhooks-types";
import { type Endpoints } from "@octokit/types";
import fs from "fs";
import path from "path";

import { addCommitAndPush } from "../git/commit";
import { addCommentToIssue } from "../github/issue";
import { runBuildCheck } from "../build/node/check";
import {
  extractFilePathWithArrow,
  extractIssueNumberFromBranchName,
  PRCommand,
  type RepoSettings,
  type BaseEventData,
} from "../utils";
import { createPR, markPRReadyForReview } from "../github/pr";
import { getIssue } from "../github/issue";
import { emitPREvent, emitTaskEvent } from "~/server/utils/events";
import { TaskStatus, TaskSubType, TodoStatus } from "~/server/db/enums";
import { checkForChanges } from "../git/operations";
import { db } from "../db/db";

export type PullRequest =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];
export type RetrievedIssue =
  Endpoints["GET /repos/{owner}/{repo}/issues/{issue_number}"]["response"]["data"];

export const MAX_ATTEMPTS_TO_FIX_BUILD_ERROR = 5;

export interface CheckAndCommitOptions extends BaseEventData {
  repository: Repository;
  token: string;
  rootPath: string;
  branch: string;
  baseBranch?: string;
  repoSettings?: RepoSettings;
  commitMessage: string;
  issue?: Issue | RetrievedIssue;
  existingPr?: PullRequest;
  newPrTitle?: string;
  newPrBody?: string;
  newPrReviewers?: string[];
  creatingStory?: boolean;
  buildErrorAttemptNumber?: number;
}

export async function checkAndCommit({
  repository,
  token,
  rootPath,
  branch,
  baseBranch,
  repoSettings,
  commitMessage,
  issue: actingOnIssue,
  existingPr,
  newPrTitle,
  newPrBody,
  newPrReviewers,
  creatingStory,
  buildErrorAttemptNumber,
  ...baseEventData
}: CheckAndCommitOptions) {
  let buildErrorMessage: string | undefined;

  try {
    await runBuildCheck({
      ...baseEventData,
      path: rootPath,
      afterModifications: true,
      repoSettings,
    });
  } catch (error) {
    const { message } = error as Error;
    buildErrorMessage = message;
  }

  const hasChanges = await checkForChanges({
    ...baseEventData,
    directory: rootPath,
    token,
  });
  if (hasChanges) {
    await addCommitAndPush({
      ...baseEventData,
      rootPath,
      branchName: branch,
      commitMessage,
      token,
    });
  }

  let issue: Issue | RetrievedIssue | undefined;

  if (actingOnIssue) {
    issue = actingOnIssue;
  } else {
    const issueNumber = extractIssueNumberFromBranchName(branch);
    if (issueNumber) {
      const result = await getIssue(repository, token, issueNumber);
      console.log(
        `[${repository.full_name}] Loaded Issue #${issueNumber} associated with PR #${existingPr?.number}`,
      );
      issue = result.data;
    } else {
      console.log(
        `[${repository.full_name}] No Issue associated with ${branch} branch for PR #${existingPr?.number}`,
      );
    }
  }

  const newFileName = extractFilePathWithArrow(issue?.title);
  const newFileExtension = newFileName ? path.extname(newFileName) : "";
  // if the new file name contains the word "component" or then it is a component
  const isComponent = newFileName?.toLowerCase().includes("component");
  const hasStorybook = fs.existsSync(path.join(rootPath, ".storybook"));
  const hasAlreadyCreatedStory =
    newFileName &&
    newFileExtension &&
    fs.existsSync(
      path.join(
        rootPath,
        newFileName.replace(newFileExtension, `.stories${newFileExtension}`),
      ),
    );

  const requestStoryCreation =
    newFileName &&
    !creatingStory &&
    isComponent &&
    hasStorybook &&
    !hasAlreadyCreatedStory;

  let prBodySuffix: string;
  if (buildErrorMessage) {
    const errorAttemptInHeading = buildErrorAttemptNumber
      ? ` (Attempt Number ${buildErrorAttemptNumber + 1})`
      : "";
    prBodySuffix = dedent`\n
      ${PRCommand.FixError}
      
      ## Error Message${errorAttemptInHeading}:
      \`\`\`
      ${buildErrorMessage}
      \`\`\`
    `;
  } else if (requestStoryCreation) {
    prBodySuffix = dedent`\n
      ## Storybook Story:
      
      I will update this PR with a storybook story for this component.
      
      ${PRCommand.CreateStory}

    `;
  } else {
    prBodySuffix = "";
  }

  let prNumber: number;
  let prTitle: string;
  let prUrl: string;
  if (!newPrTitle || !newPrBody) {
    if (!existingPr) {
      throw new Error(
        "Must provide either newPrTitle and newPrBody or existingPr",
      );
    }
    prNumber = existingPr.number;
    prTitle = existingPr.title;
    prUrl = existingPr.html_url;
    if (buildErrorMessage === undefined) {
      // Update todo status to DONE
      await db.todos
        .where({
          issueId: issue?.number ?? 0,
          projectId: baseEventData.projectId,
        })
        .update({ status: TodoStatus.DONE });

      // Emit TaskEvent with status DONE
      await emitTaskEvent({
        ...baseEventData,
        issue,
        subType: TaskSubType.EDIT_FILES,
        status: TaskStatus.DONE,
        statusMessage: "File edits completed successfully",
      });
      await markPRReadyForReview(token, existingPr.node_id);
    }
  } else {
    const { data: pullRequest } = await createPR(
      repository,
      token,
      branch,
      newPrTitle,
      `${newPrBody}\n${prBodySuffix}`,
      newPrReviewers ?? [],
      baseBranch,
      buildErrorMessage !== undefined,
    );
    await emitPREvent({ ...baseEventData, pullRequest });
    prNumber = pullRequest.number;
    prTitle = pullRequest.title;
    prUrl = pullRequest.html_url;

    console.log(`[${repository.full_name}] Created PR #${prNumber}: ${prUrl}`);
  }

  if (buildErrorMessage) {
    if ((buildErrorAttemptNumber ?? 0) >= MAX_ATTEMPTS_TO_FIX_BUILD_ERROR - 1) {
      // Too many consecutive attempts to fix the build/test error. Give up.
      const statusMessage = `Too many attempts to fix errors.\n\nThe latest error:\n\n${buildErrorMessage}`;
      // Update todo status to DONE
      await db.todos
        .where({
          issueId: issue?.number ?? 0,
          projectId: baseEventData.projectId,
        })
        .update({ status: TodoStatus.ERROR });

      // Emit TaskEvent with status DONE
      await emitTaskEvent({
        ...baseEventData,
        issue,
        subType: TaskSubType.EDIT_FILES,
        status: TaskStatus.ERROR,
        statusMessage,
      });
      throw new Error(statusMessage);
    }
    if (existingPr) {
      const nextStepsMessage = dedent`
        ## Next Steps

        I am working to resolve an error. I will update this PR with my progress.${prBodySuffix}
      `;

      const prMessage = dedent`
        This PR has been updated with a new commit.
        
        ${nextStepsMessage}
      `;

      await addCommentToIssue(repository, prNumber, token, prMessage);
    }
    if (issue) {
      const prStatus = existingPr
        ? `I've updated this pull request: [${prTitle}](${prUrl}).`
        : `I've completed my initial work on this issue and have created a pull request: [${prTitle}](${prUrl}).`;
      const issueMessage = dedent`
        ## Update

        ${prStatus}

        The changes currently result in an error, so I'll be making some additional changes before it is ready to merge.
      `;

      await addCommentToIssue(repository, issue.number, token, issueMessage);
    }
  } else if (requestStoryCreation) {
    if (existingPr) {
      const nextStepsMessage = dedent`
        ## Next Steps

        I am working to create a storybook story. I will update this PR with my progress.${prBodySuffix}
      `;

      const prMessage = dedent`
        This PR has been updated to request a storybook story.
        
        ${nextStepsMessage}
      `;

      await addCommentToIssue(repository, prNumber, token, prMessage);
    }
    if (issue) {
      const prStatus = existingPr
        ? `I've updated this pull request: [${prTitle}](${prUrl}).`
        : `I've completed my initial work on this issue and have created a pull request: [${prTitle}](${prUrl}).`;
      const issueMessage = dedent`
        ## Update

        ${prStatus}

        I will update this PR with a storybook story for this component.
      `;

      await addCommentToIssue(repository, issue.number, token, issueMessage);
    }
  } else {
    // We have completed our work on this issue. Add a comment to the issue and PR.

    const nextStepsMessage = dedent`
      ## Next Steps

      1. Please review the PR carefully. Auto-generated code can and will contain subtle bugs and mistakes.

      2. If you identify code that needs to be changed, please reject the PR with a specific reason.
      Be as detailed as possible in your comments. JACoB will take these comments, make changes to the code and push up changes.
      Please note that this process will take a few minutes.
      
      3. Once the code looks good, approve the PR and merge the code.
    `;

    const issueInfo =
      issue && !existingPr
        ? ` to address the issue [${issue.title}](${issue.html_url})`
        : "";
    const prMessage = dedent`
      Hello human! 👋
      
      This PR was ${existingPr ? "updated" : "created"} by JACoB${issueInfo}
      
      ${nextStepsMessage}
    `;
    await addCommentToIssue(repository, prNumber, token, prMessage);

    if (issue) {
      const issueMessage = dedent`
        ## Update

        I've completed my work on this issue and have ${
          existingPr ? "updated this" : "created a"
        } pull request: [${prTitle}](${prUrl}).

        Please review my changes there.
      `;

      await addCommentToIssue(repository, issue.number, token, issueMessage);

      // Update todo status to DONE
      await db.todos
        .where({
          issueId: issue.number,
          projectId: baseEventData.projectId,
        })
        .update({ status: TodoStatus.DONE });

      await emitTaskEvent({
        ...baseEventData,
        issue,
        subType: newFileName
          ? TaskSubType.CREATE_NEW_FILE
          : TaskSubType.EDIT_FILES,
        status: TaskStatus.DONE,
      });
    }
  }
}
