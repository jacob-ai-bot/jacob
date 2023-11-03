import { App, createNodeMiddleware } from "@octokit/app";
import SmeeClient from "smee-client";
import * as dotenv from "dotenv";
import { Application } from "express";
import { text } from "body-parser";

import { publishGitHubEventToQueue } from "../messaging/queue";

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
if (process.env.SMEE_URL && process.env.TARGET_URL) {
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
  // Only add a new issue to the queue if the issue body contains the @otto mention
  console.log(`Received issue #${payload.issue.number} opened event`);
  if (payload?.issue.body?.includes("@otto")) {
    console.log(`Issue #${payload.issue.number} contains @otto mention`);
    publishGitHubEventToQueue(event);
  } else {
    console.log(`Issue #${payload.issue.number} has no @otto mention`);
  }
});

// add a new webhook event handler for when an issue is labeled
ghApp.webhooks.on("issues.labeled", async (event) => {
  const { payload } = event;
  // Only add the issue to the queue if it is labeled with the "otto" label
  console.log(`Received issue #${payload.issue.number} labeled event`);
  if (payload?.label?.name === "otto") {
    console.log(`Received issue #${payload.issue.number} with label "otto"`);
    publishGitHubEventToQueue(event);
  } else {
    console.log(`Received issue #${payload.issue.number} without label "otto"`);
  }
});

// add a new webhook event handler for when an issue is edited
ghApp.webhooks.on("issues.edited", async (event) => {
  const { payload } = event;
  console.log(`Received issue #${payload.issue.number} edited event`);
  if (payload?.issue.body?.includes("@otto")) {
    console.log(`Issue #${payload.issue.number} contains @otto mention`);
    publishGitHubEventToQueue(event);
  } else {
    console.log(`Issue #${payload.issue.number} has no @otto mention`);
  }
});

// add a new webhook event handler for when an issue is assigned to a user
ghApp.webhooks.on("issues.assigned", async (event) => {
  const { payload } = event;
  console.log(
    `Received issue #${payload.issue.number} assigned event, ignoring...`,
  );
});

ghApp.webhooks.on("pull_request_review.submitted", async (event) => {
  const { payload } = event;
  console.log(`Received PR #${payload.pull_request.number} submitted event`);
  if (
    payload.review.state === "changes_requested" ||
    payload.review.state === "commented"
  ) {
    console.log(`PR #${payload.pull_request.number} should be proceesed`);
    publishGitHubEventToQueue(event);
  }
});

ghApp.webhooks.on("pull_request_review_comment.created", async (event) => {
  const { payload } = event;
  console.log(
    `Received PR #${payload.pull_request.number} review comment created event, ignoring...`,
  );
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
