import { App, createNodeMiddleware } from "@octokit/app";
import SmeeClient from "smee-client";
import * as dotenv from "dotenv";
import { Application } from "express";
import { text } from "body-parser";

import {
  publishGitHubEventToQueue,
  type WebhookPRCommentCreatedEventWithOctokit,
  type WebhookPullRequestReviewWithCommentsSubmittedEventWithOctokit,
} from "../messaging/queue";
import { PR_COMMAND_VALUES } from "../utils";
import { codeReviewCommandSuggestion } from "../github/issue";

dotenv.config();

export const ghApp = new App({
  appId: process.env.GITHUB_APP_ID ?? "",
  privateKey: process.env.GITHUB_PRIVATE_KEY ?? "",
  webhooks: {
    secret: process.env.GITHUB_WEBHOOK_SECRET ?? "",
  },
  oauth: { clientId: "", clientSecret: "" },
});

let smeeClient: SmeeClient | undefined;
if (
  process.env.SMEE_URL &&
  process.env.TARGET_URL &&
  process.env.NODE_ENV !== "test"
) {
  smeeClient = new SmeeClient({
    source: process.env.SMEE_URL,
    target: process.env.TARGET_URL,
    logger: console,
  });
}

const errorHandler = (error: Error) => {
  console.error(`Error in webhook event: ${error}`);
};

ghApp.webhooks.onError(errorHandler);

ghApp.webhooks.on("issues.opened", async (event) => {
  const { payload } = event;
  const { repository } = payload;
  // Only add a new issue to the queue if the issue body contains the @jacob-ai-bot mention
  console.log(
    `[${repository.full_name}] Received issue #${payload.issue.number} opened event`,
  );
  // NOTE: We avoid reacting to our own command suggestion in the repo installed message
  if (
    payload?.issue.body?.includes("@jacob-ai-bot") &&
    !payload?.issue.body?.includes(codeReviewCommandSuggestion)
  ) {
    console.log(
      `[${repository.full_name}] Issue #${payload.issue.number} contains @jacob-ai-bot mention`,
    );
    publishGitHubEventToQueue(event);
  } else {
    console.log(
      `[${repository.full_name}] Issue #${payload.issue.number} has no @jacob-ai-bot mention`,
    );
  }
});

// add a new webhook event handler for when an issue is labeled
// ghApp.webhooks.on("issues.labeled", async (event) => {
//   const { payload } = event;
//   // Only add the issue to the queue if it is labeled with the "jacob" label
//   console.log(`Received issue #${payload.issue.number} labeled event`);
//   if (payload?.label?.name === "jacob") {
//     console.log(`Received issue #${payload.issue.number} with label "jacob"`);
//     publishGitHubEventToQueue(event);
//   } else {
//     console.log(`Received issue #${payload.issue.number} without label "jacob"`);
//   }
// });

// add a new webhook event handler for when an issue is edited
// ghApp.webhooks.on("issues.edited", async (event) => {
//   const { payload } = event;
//   console.log(`Received issue #${payload.issue.number} edited event`);
//   if (payload?.issue.body?.includes("@jacob-ai-bot")) {
//     console.log(`Issue #${payload.issue.number} contains @jacob-ai-bot mention`);
//     publishGitHubEventToQueue(event);
//   } else {
//     console.log(`Issue #${payload.issue.number} has no @jacob-ai-bot mention`);
//   }
// });

// add a new webhook event handler for when an issue is assigned to a user
// ghApp.webhooks.on("issues.assigned", async (event) => {
//   const { payload } = event;
//   console.log(
//     `Received issue #${payload.issue.number} assigned event, ignoring...`,
//   );
// });

ghApp.webhooks.on("pull_request_review.submitted", async (event) => {
  const { payload } = event;
  const { repository } = payload;
  console.log(
    `[${repository.full_name}] Received PR #${payload.pull_request.number} submitted event`,
  );
  const appUsername = process.env.GITHUB_APP_USERNAME;

  const ottoShouldRespond =
    payload.review.body?.includes("@jacob-ai-bot") ||
    (appUsername && `${payload.pull_request.user.id}` === appUsername);

  if (
    ottoShouldRespond &&
    payload.action === "submitted" &&
    (payload.review.state === "changes_requested" ||
      payload.review.state === "commented")
  ) {
    console.log(
      `[${repository.full_name}] PR #${payload.pull_request.number} should be processed`,
    );
    publishGitHubEventToQueue(
      event as WebhookPullRequestReviewWithCommentsSubmittedEventWithOctokit,
    );
  }
});

ghApp.webhooks.on("issue_comment.created", async (event) => {
  const { payload } = event;
  const { comment, issue, repository } = payload;
  console.log(
    `[${repository.full_name}] Received issue #${issue.number} comment created event`,
  );
  if (
    issue.pull_request &&
    PR_COMMAND_VALUES.some((cmd) => comment.body?.includes(cmd))
  ) {
    const prCommentCreatedEvent =
      event as WebhookPRCommentCreatedEventWithOctokit;
    console.log(
      `[${repository.full_name}] Pull request comment body contains @jacob-ai-bot <cmd> mention (PR #${issue.number})`,
    );
    publishGitHubEventToQueue(prCommentCreatedEvent);
  } else if (comment.body?.includes("@jacob-ai-bot build")) {
    console.log(
      `[${repository.full_name}] Issue comment body contains @jacob-ai-bot build mention (Issue #${issue.number})`,
    );
    publishGitHubEventToQueue(event);
  } else {
    console.log(
      `[${repository.full_name}] Issue comment is not a PR comment or body has no @jacob-ai-bot <cmd> mention (Issue #${issue.number})`,
    );
  }
});

ghApp.webhooks.on("pull_request.opened", async (event) => {
  const { payload } = event;
  const { pull_request, repository } = payload;
  console.log(
    `[${repository.full_name}] Received PR #${pull_request.number} comment created event`,
  );

  if (PR_COMMAND_VALUES.some((cmd) => pull_request.body?.includes(cmd))) {
    console.log(
      `[${repository.full_name}] Pull request body contains @jacob-ai-bot <cmd> mention (PR #${pull_request.number})`,
    );
    publishGitHubEventToQueue(event);
  } else {
    console.log(
      `[${repository.full_name}] Pull request body has no @jacob-ai-bot fix <cmd> mention (Issue #${pull_request.number})`,
    );
  }
});

ghApp.webhooks.on("installation_repositories.added", async (event) => {
  const { payload } = event;
  const { repositories_added } = payload;
  const repos = repositories_added.map(({ full_name }) => full_name).join(",");

  console.log(`[${repos}] Received installation repositories added event`);

  publishGitHubEventToQueue(event);
});

ghApp.webhooks.onAny(async ({ id, name }) => {
  console.log(`GitHub Webhook Handled: Event Name: ${name} (id: ${id})`);
});

export async function setupGitHubWebhook(app: Application): Promise<void> {
  app.post(
    "/api/github/webhooks",
    text({ type: "*/*" }),
    createNodeMiddleware(ghApp),
  );

  const events: EventSource | undefined = smeeClient?.start();
  if (events) {
    console.log("Smee event stream started");
  }

  process.on("SIGTERM", () => {
    console.info("Gracefully shutting down smee event stream...");
    events?.close();
    process.exit(0);
  });
}
