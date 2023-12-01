import dedent from "ts-dedent";
import { Repository } from "@octokit/webhooks-types";

import { addCommentToIssue } from "../github/issue";
import { PRCommand } from "../utils";

interface AddStartingWorkCommentBaseParams {
  repository: Repository;
  token: string;
}

interface AddStartingWorkCommentIssueOpenedParams {
  issueOpenedNumber: number;
}

interface AddStartingWorkCommentPRCommandParams {
  prNumber: number;
  prCommand: PRCommand;
}

type AddStartingWorkCommentParams = AddStartingWorkCommentBaseParams &
  (
    | AddStartingWorkCommentIssueOpenedParams
    | AddStartingWorkCommentPRCommandParams
  );

export function addStartingWorkComment(options: AddStartingWorkCommentParams) {
  const { repository, token } = options;
  if ("issueOpenedNumber" in options) {
    const { issueOpenedNumber } = options;
    const message = dedent`
            Otto here...
            
            You mentioned me on this issue and I am busy taking a look at it.
            
            I'll continue to comment on this issue with status as I make progress.
        `;
    return addCommentToIssue(repository, issueOpenedNumber, token, message);
  } else {
    const { prNumber, prCommand } = options;
    let updateMessage: string;
    switch (prCommand) {
      case PRCommand.FixBuildError:
        updateMessage = "I'm busy working on this build error.";
        break;
      case PRCommand.CreateStory:
        updateMessage =
          "I'm busy creating a storybook story for this component.";
        break;
      case PRCommand.CodeReview:
        updateMessage = "I'm starting a code review on this PR.";
        break;
    }
    const message = dedent`Otto here...\n
        ${updateMessage}
        
        I'll continue to comment on this pull request with status as I make progress.
        `;
    return addCommentToIssue(repository, prNumber, token, message);
  }
}

export function addFailedWorkComment(
  repository: Repository,
  issueOrPRNumber: number,
  token: string,
  error: Error,
) {
  const message = dedent`
    Unfortunately, I ran into trouble working on this.
    
    Here is some error information:
    ${(error as { message?: string })?.message ?? error.toString()}
    
    I'll try again in a few minutes.
  `;
  return addCommentToIssue(repository, issueOrPRNumber, token, message);
}
