import { Webhooks, createNodeMiddleware } from "@octokit/webhooks";
import SmeeClient from "smee-client";
import * as dotenv from "dotenv";
import { Application } from "express";

dotenv.config();

const webhooks = new Webhooks({
  secret: process.env.GITHUB_WEBHOOK_SECRET ?? "",
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

webhooks.onError(errorHandler);

webhooks.on("issues.opened", async ({ payload }) => {
  // Only add a new issue to the queue if the issue body contains the @otto mention
  console.log(`Received issue #${payload.issue.number} opened event`);
  if (payload?.issue.body?.includes("@otto")) {
    console.log(`Issue #${payload.issue.number} contains @otto mention`);
  } else {
    console.log(`Issue #${payload.issue.number} has no @otto mention`);
  }
});

// add a new webhook event handler for when an issue is labeled
webhooks.on("issues.labeled", async ({ payload }) => {
  // Only add the issue to the queue if it is labeled with the "otto" label
  console.log(`Received issue #${payload.issue.number} labeled event`);
  if (payload?.label?.name === "otto") {
    console.log(`Received issue #${payload.issue.number} with label "otto"`);
  } else {
    console.log(`Received issue #${payload.issue.number} without label "otto"`);
  }
});

// add a new webhook event handler for when an issue is edited
webhooks.on("issues.edited", async ({ payload }) => {
  console.log(`Received issue #${payload.issue.number} edited event`);
  if (payload?.issue.body?.includes("@otto")) {
    console.log(`Issue #${payload.issue.number} contains @otto mention`);
  } else {
    console.log(`Issue #${payload.issue.number} has no @otto mention`);
  }
});

// add a new webhook event handler for when an issue is assigned to a user
webhooks.on("issues.assigned", async ({ payload }) => {
  console.log(`Received issue #${payload.issue.number} assigned event`);
  const ottoLogin = process.env.OTTO_GITHUB_USERNAME;
  if (ottoLogin && payload?.assignee?.login === ottoLogin) {
    console.log(`Issue #${payload.issue.number} assigned to ${ottoLogin}`);
  } else if (payload?.issue.body?.includes("@otto")) {
    console.log(`Issue #${payload.issue.number} contains @otto mention`);
  }
});

webhooks.on("pull_request_review.submitted", async ({ payload }) => {
  console.log(`Received PR #${payload.pull_request.number} submitted event`);
  if (
    payload.review.state === "changes_requested" ||
    payload.review.state === "commented"
  ) {
    console.log(`PR #${payload.pull_request.number} should be proceesed`);
  }
});

webhooks.on("pull_request_review_comment.created", async ({ payload }) => {
  console.log(
    `Received PR #${payload.pull_request.number} review comment created event`,
  );
});

export async function setupGitHubWebhook(app: Application): Promise<void> {
  app.use(
    createNodeMiddleware(webhooks, {
      path: "/",
    }),
  );

  const events: EventSource | undefined = smeeClient?.start();
  console.log("Smee event stream started");

  process.on("SIGTERM", () => {
    console.info("Gracefully shutting down smee event stream...");
    events?.close();
    process.exit(0);
  });
}
