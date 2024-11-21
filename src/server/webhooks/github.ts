import { App } from "@octokit/app";
import * as dotenv from "dotenv";
import { Octokit } from "@octokit/rest";

import {
  authInstallation,
  publishGitHubEventToQueue,
  type WebhookPRCommentCreatedEventWithOctokit,
  type WebhookPullRequestReviewWithCommentsSubmittedEventWithOctokit,
} from "../messaging/queue";
import { AT_MENTION } from "../utils";
import { codeReviewCommandSuggestion } from "../github/issue";
import { db } from "../db/db";
import { getOrCreateTodo } from "../utils/todos";
import { sendTransactionalEmail } from "../utils/email";
import { posthogClient } from "../analytics/posthog";
import { TodoStatus } from "../db/enums";
import { getRepositoryLogins } from "../github/repo";

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

  // Only add a new issue to the queue if the issue body contains the @jacob-ai-bot mention
  console.log(
    `[${repository.full_name}] Received issue #${payload.issue.number} opened event`,
  );

  // NOTE: We avoid reacting to our own command suggestion in the repo installed message
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
    // Create a new todo item in the database
    try {
      const project = await db.projects.findBy({
        repoFullName: repository.full_name,
      });
      const existingTodo = await db.todos.findByOptional({
        projectId: project.id,
        issueId: payload.issue.number,
      });
      // if the todo for this issue is already in the database, do not create a new todo item
      if (!existingTodo) {
        const installationAuthentication = await authInstallation(
          installation?.id,
        );
        const todo = await getOrCreateTodo({
          repo: repository.full_name,
          projectId: project.id,
          agentEnabled: project.agentEnabled,
          issueNumber: payload.issue.number,
          accessToken: installationAuthentication?.token,
        });
        posthogClient.capture({
          distinctId: String(payload.issue.user.id) ?? "",
          event: "Todo Created",
          properties: {
            todoId: todo?.id ?? 0,
            projectId: project.id,
            name: todo?.name ?? "",
            status: todo?.status ?? TodoStatus.TODO,
            issueId: payload.issue.number,
          },
        });

        console.log(
          `[${repository.full_name}] New todo item created for issue #${payload.issue.number}`,
        );
        const [githubOrg, githubRepo] = repository.full_name.split("/");

        try {
          const collaboratorLogins = await getRepositoryLogins(
            githubOrg ?? "",
            githubRepo ?? "",
            installationAuthentication?.token ?? "",
          );

          const jacobUsers = await db.users
            .whereIn("login", collaboratorLogins)
            .select("id", "email");

          const planSteps = await db.planSteps
            .where({
              projectId: project.id,
              issueNumber: payload.issue.number,
              isActive: true,
            })
            .all()
            .order("createdAt");

          const researchDetails = await db.research
            .where({
              todoId: todo?.id ?? 0,
              issueId: payload.issue.number,
            })
            .all();

          for (const user of jacobUsers) {
            if (user.email && todo) {
              try {
                console.log(
                  `[${repository.full_name}] Sending transactional email to ${user.email} for issue #${payload.issue.number}`,
                );
                await sendTransactionalEmail(
                  user.email,
                  todo,
                  githubOrg ?? "",
                  githubRepo ?? "",
                  planSteps,
                  researchDetails,
                );
                console.log(
                  `[${repository.full_name}] Sent transactional email to ${user.email} for issue #${payload.issue.number}`,
                );
              } catch (error) {
                console.error(
                  `[${repository.full_name}] Error sending transactional email to ${user.email} for issue #${payload.issue.number}: ${String(error)}`,
                );
              }
            }
          }
        } catch (error) {
          console.error(
            `[${repository.full_name}] Error fetching collaborators or sending emails for issue #${payload.issue.number}: ${String(error)}`,
          );
        }
      }
    } catch (error) {
      console.error(
        `[${repository.full_name}] Error creating todo item for issue #${payload.issue.number}: ${String(error)}`,
      );
    }
  }
});

// add a new webhook event handler for when an issue is edited
ghApp.webhooks.on("issues.edited", async (event) => {
  const { payload } = event;
  const { repository } = payload;
  // Only add a new issue to the queue if the issue body contains the @jacob-ai-bot mention for the first time
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
