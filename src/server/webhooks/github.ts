import { App } from "@octokit/app";
import * as dotenv from "dotenv";

import {
  authInstallation,
  publishGitHubEventToQueue,
  type WebhookPRCommentCreatedEventWithOctokit,
  type WebhookPullRequestReviewWithCommentsSubmittedEventWithOctokit,
} from "../messaging/queue";
import { AT_MENTION } from "../utils";
import { codeReviewCommandSuggestion } from "../github/issue";
import { db } from "../db/db";
import { createTodo } from "../utils/todos";
import { sendTransactionalEmail } from "../utils/email";

dotenv.config();

export const ghApp = new App({
  appId: process.env.GITHUB_APP_ID ?? "",
  privateKey: process.env.GITHUB_PRIVATE_KEY ?? "",
  webhooks: {
    secret: process.env.GITHUB_WEBHOOK_SECRET ?? "",
  },
  oauth: { clientId: "", clientSecret: "" },
});

const errorHandler = (error: Error) => {
  console.error(`Error in webhook event: ${String(error)}`);
};

ghApp.webhooks.onError(errorHandler);

ghApp.webhooks.on("issues.opened", async (event) => {
  const { payload } = event;
  const { repository, installation } = payload;

  console.log(
    `[${repository.full_name}] Received issue #${payload.issue.number} opened event`,
  );

  if (
    payload?.issue.body?.includes(AT_MENTION) &&
    !payload?.issue.body?.includes(codeReviewCommandSuggestion)
  ) {
    console.log(
      `[${repository.full_name}] Issue #${payload.issue.number} contains ${AT_MENTION} mention`,
    );
    void publishGitHubEventToQueue(event);
  } else {
    console.log(
      `[${repository.full_name}] Issue #${payload.issue.number} has no ${AT_MENTION} mention`,
    );
    try {
      const project = await db.projects.findBy({
        repoFullName: repository.full_name,
      });
      const todos = await db.todos.selectAll().where({
        projectId: project.id,
      });
      if (!todos.some((todo) => todo.issueId === payload.issue.number)) {
        const installationAuthentication = await authInstallation(
          installation?.id,
        );
        const todo = await createTodo(
          repository.full_name,
          project.id,
          payload?.issue.number,
          installationAuthentication?.token,
        );

        console.log(
          `[${repository.full_name}] New todo item created for issue #${payload.issue.number}`,
        );

        const [githubOrg, githubRepo] = repository.full_name.split("/");
        const user = await db.users.findBy({ login: payload.issue.user.login });
        const userEmail = user?.email;

        if (userEmail) {
          try {
            await sendTransactionalEmail(
              userEmail,
              { id: todo.id, name: todo.name, description: todo.description },
              githubOrg,
              githubRepo,
            );
            console.log(`Transactional email sent to ${userEmail}`);
          } catch (error) {
            console.error(`Failed to send email to ${userEmail}:`, error);
          }
        } else {
          console.warn(`Email not found for user: ${payload.issue.user.login}`);
        }
      }
    } catch (error) {
      console.error(
        `[${repository.full_name}] Error creating todo item for issue #${payload.issue.number}: ${String(error)}`,
      );
    }
  }
});

ghApp.webhooks.on("issues.edited", async (event) => {
  const { payload } = event;
  const { repository } = payload;
  console.log(
    `[${repository.full_name}] Received issue #${payload.issue.number} edited event`,
  );
  if (
    payload?.issue.body?.includes(AT_MENTION) &&
    !payload?.issue.body?.includes(codeReviewCommandSuggestion) &&
    !payload.changes?.body?.from?.includes(AT_MENTION)
  ) {
    console.log(
      `[${repository.full_name}] Issue #${payload.issue.number} contains ${AT_MENTION} mention`,
    );
    void publishGitHubEventToQueue(event);
  } else {
    console.log(
      `[${repository.full_name}] Issue #${payload.issue.number} has no ${AT_MENTION} mention`,
    );
  }
});

ghApp.webhooks.on("pull_request_review.submitted", async (event) => {
  const { payload } = event;
  const { repository } = payload;
  console.log(
    `[${repository.full_name}] Received PR #${payload.pull_request.number} submitted event`,
  );
  const appUsername = process.env.GITHUB_APP_USERNAME;

  const shouldRespond =
    !!payload.review.body?.includes(AT_MENTION) ||
    (appUsername && `${payload.pull_request.user.id}` === appUsername);

  if (
    shouldRespond &&
    payload.action === "submitted" &&
    (payload.review.state === "changes_requested" ||
      payload.review.state === "commented")
  ) {
    console.log(
      `[${repository.full_name}] PR #${payload.pull_request.number} should be processed`,
    );
    void publishGitHubEventToQueue(
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
  if (issue.pull_request && comment.body?.includes(AT_MENTION)) {
    const prCommentCreatedEvent =
      event as WebhookPRCommentCreatedEventWithOctokit;
    console.log(
      `[${repository.full_name}] Pull request comment body contains ${AT_MENTION} mention (PR #${issue.number})`,
    );
    void publishGitHubEventToQueue(prCommentCreatedEvent);
  } else if (comment.body?.includes(AT_MENTION)) {
    console.log(
      `[${repository.full_name}] Issue comment body contains ${AT_MENTION} mention (Issue #${issue.number})`,
    );
    void publishGitHubEventToQueue(event);
  } else {
    console.log(
      `[${repository.full_name}] Issue comment is not a PR comment or body has no ${AT_MENTION} mention (Issue #${issue.number})`,
    );
  }
});

ghApp.webhooks.on("pull_request.opened", async (event) => {
  const { payload } = event;
  const { pull_request, repository } = payload;
  console.log(
    `[${repository.full_name}] Received PR #${pull_request.number} opened event`,
  );

  if (pull_request.body?.includes(AT_MENTION)) {
    console.log(
      `[${repository.full_name}] Pull request body contains ${AT_MENTION} mention (PR #${pull_request.number})`,
    );
    void publishGitHubEventToQueue(event);
  } else {
    console.log(
      `[${repository.full_name}] Pull request body has no ${AT_MENTION} mention (Issue #${pull_request.number})`,
    );
  }
});

ghApp.webhooks.on("pull_request.closed", async (event) => {
  const { payload } = event;
  const { pull_request, repository } = payload;

  console.log(
    `[${repository.full_name}] Received PR #${pull_request.number} closed event`,
  );

  void publishGitHubEventToQueue(event);
});

ghApp.webhooks.on("installation_repositories.added", async (event) => {
  const { payload } = event;
  const { repositories_added } = payload;
  const repos = repositories_added.map(({ full_name }) => full_name).join(",");

  console.log(`[${repos}] Received installation repositories added event`);

  void publishGitHubEventToQueue(event);
});

ghApp.webhooks.on("installation.created", async (event) => {
  const { payload } = event;
  const { repositories } = payload;
  const repos = (repositories ?? [])
    .map(({ full_name }) => full_name)
    .join(",");

  console.log(`[${repos}] Received installation event`);

  void publishGitHubEventToQueue(event);
});

ghApp.webhooks.onAny(async ({ id, name }) => {
  console.log(`GitHub Webhook Handled: Event Name: ${name} (id: ${id})`);
});
