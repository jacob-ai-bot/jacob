import dedent from "ts-dedent";
import { Repository } from "@octokit/webhooks-types";

import { addCommentToIssue } from "../github/issue";
import { PRCommand, ExecAsyncException } from "../utils";

interface AddStartingWorkCommentBaseParams {
  repository: Repository;
  token: string;
}

interface AddStartingWorkCommentIssueOpenedParams {
  task: "issueOpened";
  issueNumber: number;
}

interface AddStartingWorkCommentPRReviewParams {
  task: "prReview";
  prNumber: number;
}

interface AddStartingWorkCommentPRCommandParams {
  task: "prCommand";
  prNumber: number;
  prCommand: PRCommand;
}

interface AddStartingWorkCommentIssueCommandParams {
  task: "issueCommand";
  issueNumber: number;
}

type AddStartingWorkCommentParams = AddStartingWorkCommentBaseParams &
  (
    | AddStartingWorkCommentIssueOpenedParams
    | AddStartingWorkCommentPRReviewParams
    | AddStartingWorkCommentPRCommandParams
    | AddStartingWorkCommentIssueCommandParams
  );

export function addStartingWorkComment(options: AddStartingWorkCommentParams) {
  const { repository, token, task } = options;
  switch (task) {
    case "issueCommand": {
      const { issueNumber } = options;
      const message = dedent`
        JACoB here...
          
        I will attempt to build this repository and will comment on this issue once I'm done.
      `;
      return addCommentToIssue(repository, issueNumber, token, message);
    }
    case "issueOpened": {
      const { issueNumber } = options;
      const message = dedent`
        JACoB here...
          
        You mentioned me on this issue and I am busy taking a look at it.
          
        I'll continue to comment on this issue with status as I make progress.
      `;
      return addCommentToIssue(repository, issueNumber, token, message);
    }
    case "prReview": {
      const { prNumber } = options;
      const message = dedent`
        JACoB here...
          
        I'm responding to a code review on this PR.
      `;
      return addCommentToIssue(repository, prNumber, token, message);
    }
    case "prCommand": {
      const { prNumber, prCommand } = options;
      let updateMessage: string;
      switch (prCommand) {
        case PRCommand.FixError:
          updateMessage = "I'm busy working on this error.";
          break;
        case PRCommand.CreateStory:
          updateMessage =
            "I'm busy creating a storybook story for this component.";
          break;
        case PRCommand.CodeReview:
          updateMessage = "I'm starting a code review on this PR.";
          break;
      }
      const message = dedent`JACoB here...\n
        ${updateMessage}
        
        I'll continue to comment on this pull request with status as I make progress.
        `;
      return addCommentToIssue(repository, prNumber, token, message);
    }
  }
}

export function addFailedWorkComment(
  repository: Repository,
  issueOrPRNumber: number,
  token: string,
  issueOpened: boolean,
  prReview: boolean,
  error: Error,
) {
  const asyncException = (
    typeof error === "object" ? error : { error }
  ) as Partial<ExecAsyncException>;

  const errorMsg = error.message ?? error.toString();
  let message = dedent`
    Unfortunately, I ran into trouble working on this.
    
    Here is some error information:
    \`\`\`
    ${errorMsg}
    \`\`\`
  `;
  // If the error message is about a clean working tree, we can provide a more specific message.
  if (
    asyncException.stdout?.includes("nothing to commit, working tree clean")
  ) {
    if (issueOpened) {
      message = dedent`
        I was not able to write any code that would address this issue.

        Please include more specific details in issues when you mention me.
      `;
    } else if (prReview) {
      message = dedent`
        I was not able to address the review comments on this PR.

        Please include more specific details in the PR review comments.
      `;
    } else {
      message = dedent`
        Unfortunately, I ran into trouble working on this.

        I was not able to write the requested code. Please contact support on https://docs.jacb.ai.
      `;
    }
  }
  return addCommentToIssue(repository, issueOrPRNumber, token, message);
}
