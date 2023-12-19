import dedent from "ts-dedent";
import { Issue, Repository } from "@octokit/webhooks-types";
import { Endpoints } from "@octokit/types";
import fs from "fs";
import path from "path";

import { addCommitAndPush } from "../git/commit";
import { addCommentToIssue } from "../github/issue";
import { runBuildCheck } from "../build/node/check";
import {
  ExecAsyncException,
  extractFilePathWithArrow,
  PRCommand,
} from "../utils";
import { createPR, markPRReadyForReview } from "../github/pr";
import { getIssue } from "../github/issue";
import { dynamicImport } from "../utils/dynamicImport";
import stripAnsi from "strip-ansi";

export type PullRequest =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];
export type RetrievedIssue =
  Endpoints["GET /repos/{owner}/{repo}/issues/{issue_number}"]["response"]["data"];

interface CheckAndCommitOptions {
  repository: Repository;
  token: string;
  rootPath: string;
  branch: string;
  commitMessage: string;
  issue?: Issue | RetrievedIssue;
  existingPr?: PullRequest;
  newPrTitle?: string;
  newPrBody?: string;
  newPrReviewers?: string[];
  creatingStory?: boolean;
}

export async function checkAndCommit({
  repository,
  token,
  rootPath,
  branch,
  commitMessage,
  issue: actingOnIssue,
  existingPr,
  newPrTitle,
  newPrBody,
  newPrReviewers,
  creatingStory,
}: CheckAndCommitOptions) {
  let buildErrorMessage: string | undefined;

  try {
    await runBuildCheck(rootPath);
  } catch (error) {
    const { message } = error as ExecAsyncException;
    // Awkward workaround to dynamically import an ESM module
    // within a commonjs TypeScript module

    // See Option #4 here: https://github.com/TypeStrong/ts-node/discussions/1290
    const stripAnsiFn = (await dynamicImport("strip-ansi"))
      .default as typeof stripAnsi;
    buildErrorMessage = stripAnsiFn(message);
  }

  await addCommitAndPush(rootPath, branch, commitMessage);

  let issue: Issue | RetrievedIssue;

  if (actingOnIssue) {
    issue = actingOnIssue;
  } else {
    const regex = /otto-issue-(\d+)-.*/;
    const match = branch.match(regex);
    const issueNumber = parseInt(match?.[1] ?? "", 10);
    const result = await getIssue(repository, token, issueNumber);
    console.log(
      `Loaded Issue #${issueNumber} associated with PR #${existingPr?.number}`,
    );
    issue = result.data;
  }

  const newFileName = extractFilePathWithArrow(issue.title);
  // if the new file name contains the word "component" or then it is a component
  const isComponent = newFileName?.toLowerCase().includes("component");
  const hasStorybook = fs.existsSync(path.join(rootPath, ".storybook"));
  const hasAlreadyCreatedStory =
    newFileName &&
    fs.existsSync(
      path.join(rootPath, newFileName.replace(".tsx", ".stories.tsx")),
    );

  const requestStoryCreation =
    !creatingStory && isComponent && hasStorybook && !hasAlreadyCreatedStory;

  let prBodySuffix: string;
  if (buildErrorMessage) {
    prBodySuffix = dedent`\n
      ${PRCommand.FixBuildError}
      
      ## Error Message:
      
      ${buildErrorMessage}
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
      buildErrorMessage !== undefined,
    );
    prNumber = pullRequest.number;
    prTitle = pullRequest.title;
    prUrl = pullRequest.html_url;

    console.log(`Created PR #${prNumber}: ${prUrl}`);
  }

  if (buildErrorMessage) {
    if (existingPr) {
      const nextStepsMessage = dedent`
        ## Next Steps

        I am working to resolve a build error. I will update this PR with my progress.${prBodySuffix}
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

        The changes currently result in a build error, so I'll be making some additional changes before it is ready to merge.
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
      Be as detailed as possible in your comments. Otto will take these comments, make changes to the code and push up changes.
      Please note that this process will take a few minutes.
      
      3. Once the code looks good, approve the PR and merge the code.
    `;

    const issueInfo =
      issue && !existingPr
        ? ` to address the issue [${issue.title}](${issue.html_url})`
        : "";
    const prMessage = dedent`
      Hello human! 👋
      
      This PR was ${existingPr ? "updated" : "created"} by Otto${issueInfo}
      
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
    }
  }
}
