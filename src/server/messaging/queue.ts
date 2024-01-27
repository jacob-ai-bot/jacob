import ampq from "amqplib";
import { Octokit } from "@octokit/core";
import { EmitterWebhookEvent } from "@octokit/webhooks";
import { Repository } from "@octokit/webhooks-types";
import { createAppAuth } from "@octokit/auth-app";

import { db } from "../db/db";
import { cloneRepo } from "../git/clone";
import { runBuildCheck } from "../build/node/check";
import { createNewFile } from "../code/newFile";
import { editFiles } from "../code/editFiles";
import { getPR } from "../github/pr";
import { fixBuildError } from "../code/fixBuildError";
import { createStory } from "../code/createStory";
import { codeReview } from "../code/codeReview";
import { respondToCodeReview } from "../code/respondToCodeReview";
import {
  extractFilePathWithArrow,
  PRCommand,
  PR_COMMAND_VALUES,
  enumFromStringValue,
  getRepoSettings,
} from "../utils";
import {
  addFailedWorkComment,
  addStartingWorkComment,
} from "../github/comments";
import { createRepoInstalledIssue } from "../github/issue";

const QUEUE_NAME = "github_event_queue";

const auth = createAppAuth({
  appId: process.env.GITHUB_APP_ID ?? "",
  privateKey: process.env.GITHUB_PRIVATE_KEY ?? "",
});

let channel: ampq.Channel | undefined;
const LOCALHOST_RABBITMQ_PORT = process.env.RABBITMQ_PORT ?? 5672;
const RABBITMQ_URL =
  process.env.RABBITMQ_URL ?? `amqp://localhost:${LOCALHOST_RABBITMQ_PORT}`;

async function initRabbitMQ() {
  try {
    const connection = await ampq.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, { durable: true });

    channel.prefetch(1);
    channel.consume(
      QUEUE_NAME,
      async (message) => {
        if (!message) {
          console.error(`null message received from channel.consume()!`);
          return;
        }
        console.log(`Received queue message: ${message.properties.messageId}`);
        try {
          const event = JSON.parse(
            message.content.toString(),
          ) as WebhookQueuedEvent;
          await onGitHubEvent(event);
          channel?.ack(message);
        } catch (error) {
          console.error(`Error parsing or processing message: ${error}`);
          channel?.nack(message);
        }
      },
      {
        noAck: false,
      },
    );
    console.log(`Initialized RabbitMQ`);
  } catch (error) {
    console.error(`Error initializing RabbitMQ: ${error}`);
    return;
  }
}

async function addProjectToDB(
  repository: Pick<Repository, "id" | "node_id" | "name" | "full_name">,
  eventId: string,
  eventName: string,
) {
  const projectUpdate = {
    repoName: repository.name,
    repoFullName: repository.full_name,
    repoNodeId: repository.node_id,
  };
  const project = await db.projects
    .create({
      ...projectUpdate,
      repoId: `${repository.id}`,
    })
    .onConflict("repoId")
    .merge(projectUpdate);
  console.log(
    `[${repository.full_name}] onGitHubEvent: ${eventId} ${eventName} : DB project ID: ${project.id}`,
  );
}

async function authInstallation(installationId?: number) {
  if (installationId) {
    return auth({
      type: "installation",
      installationId,
    });
  }
}

async function onReposAdded(event: WebhookInstallationRepositoriesAddedEvent) {
  const { repositories_added: repos, installation, sender } = event.payload;

  const installationAuthentication = await authInstallation(installation?.id);
  if (!installationAuthentication) {
    console.error(
      `onReposAdded: ${event.id} ${event.name} : no installationId`,
    );
    return;
  }
  return Promise.all(
    repos.map(async (repo) => {
      console.log(
        `onReposAdded: ${event.id} ${event.name} : ${repo.full_name} ${repo.id}`,
      );
      const repository = { ...repo, owner: installation.account };

      try {
        await addProjectToDB(repo, event.id, event.name);
        const { path, cleanup } = await cloneRepo(
          repo.full_name,
          undefined,
          installationAuthentication.token,
        );

        console.log(`[${repo.full_name}] repo cloned to ${path}`);

        const repoSettings = getRepoSettings(path);

        try {
          await runBuildCheck(path, repoSettings);
          await createRepoInstalledIssue(
            repository,
            installationAuthentication.token,
            sender.login,
          );
        } finally {
          console.log(`[${repo.full_name}] cleaning up repo cloned to ${path}`);
          cleanup();
        }
      } catch (error) {
        await createRepoInstalledIssue(
          repository,
          installationAuthentication.token,
          sender.login,
          error as Error,
        );
      }
    }),
  );
}

export async function onGitHubEvent(event: WebhookQueuedEvent) {
  if (event.name === "installation_repositories") {
    console.log(`onGitHubEvent: ${event.id} ${event.name}`);
    return onReposAdded(event);
  }
  const {
    name: eventName,
    payload: { repository, installation },
  } = event;
  const start = Date.now();
  console.log(
    `[${repository.full_name}] onGitHubEvent: ${event.id} ${eventName}`,
  );

  await addProjectToDB(repository, event.id, eventName);

  const installationAuthentication = await authInstallation(installation?.id);
  if (installationAuthentication) {
    const issueOpened = eventName === "issues";
    const prOpened = eventName === "pull_request";
    const prComment = eventName === "issue_comment";
    const prReview = eventName === "pull_request_review";
    const eventIssueOrPRNumber =
      eventName === "pull_request" || eventName === "pull_request_review"
        ? event.payload.pull_request.number
        : event.payload.issue.number;
    const body =
      eventName === "pull_request"
        ? event.payload.pull_request.body
        : eventName === "pull_request_review"
        ? event.payload.review.body
        : eventName === "issue_comment"
        ? event.payload.comment.body
        : event.payload.issue.body;
    const prCommand = enumFromStringValue(
      PRCommand,
      prOpened || prComment
        ? PR_COMMAND_VALUES.find((cmd) => body?.includes(cmd))
        : undefined,
    );
    if ((prOpened || prComment) && !prCommand) {
      throw new Error(
        "Valid prCommand expected for queued PR opened or comment event",
      );
    }
    if (prCommand && issueOpened) {
      throw new Error(
        "prCommand unexpected while handling queued issue opened event",
      );
    }

    await addStartingWorkComment({
      repository,
      token: installationAuthentication.token,
      ...(prCommand
        ? {
            task: "prCommand",
            prNumber: eventIssueOrPRNumber,
            prCommand: prCommand,
          }
        : prReview
        ? { task: "prReview", prNumber: eventIssueOrPRNumber }
        : {
            task: "issueOpened",
            issueOpenedNumber: eventIssueOrPRNumber,
          }),
    });

    let existingPr: Awaited<ReturnType<typeof getPR>>["data"] | undefined;
    let prBranch: string | undefined;
    if (prCommand || prReview) {
      const result = await getPR(
        repository,
        installationAuthentication.token,
        eventIssueOrPRNumber,
      );
      existingPr = result.data;
      prBranch = existingPr.head.ref;
    }

    try {
      const { path, cleanup } = await cloneRepo(
        repository.full_name,
        prBranch,
        installationAuthentication.token,
      );

      console.log(`[${repository.full_name}] repo cloned to ${path}`);

      const repoSettings = getRepoSettings(path);

      try {
        if (issueOpened) {
          await runBuildCheck(path, repoSettings);

          const issueTitle = event.payload.issue.title;

          const newFileName = extractFilePathWithArrow(issueTitle);
          if (newFileName) {
            await createNewFile(
              newFileName,
              repository,
              installationAuthentication.token,
              event.payload.issue,
              path,
              repoSettings,
            );
          } else {
            await editFiles(
              repository,
              installationAuthentication.token,
              event.payload.issue,
              path,
              repoSettings,
            );
          }
        } else if (prReview) {
          if (!prBranch || !existingPr) {
            throw new Error("prBranch and existingPr when handling prReview");
          }
          await respondToCodeReview(
            repository,
            installationAuthentication.token,
            path,
            repoSettings,
            prBranch,
            existingPr,
            event.payload.review.state,
            body,
          );
        } else if (prCommand) {
          if (!prBranch || !existingPr) {
            throw new Error("prBranch and existingPr when handling prCommand");
          }
          switch (prCommand) {
            case PRCommand.CreateStory:
              await createStory(
                repository,
                installationAuthentication.token,
                path,
                prBranch,
                repoSettings,
                existingPr,
              );
              break;
            case PRCommand.CodeReview:
              await codeReview(
                repository,
                installationAuthentication.token,
                path,
                prBranch,
                repoSettings,
                existingPr,
              );
              break;
            case PRCommand.FixBuildError:
              await fixBuildError(
                repository,
                installationAuthentication.token,
                eventName === "pull_request" ? null : event.payload.issue,
                eventName === "pull_request"
                  ? event.payload.pull_request.body
                  : event.payload.comment.body,
                path,
                prBranch,
                repoSettings,
                existingPr,
              );
              break;
          }
        }
      } finally {
        console.log(
          `[${repository.full_name}] cleaning up repo cloned to ${path}`,
        );
        cleanup();
      }
    } catch (error) {
      await addFailedWorkComment(
        repository,
        eventIssueOrPRNumber,
        installationAuthentication.token,
        error as Error,
      );
    }
  } else {
    console.error(
      `[${repository.full_name}] onGitHubEvent: ${event.id} ${eventName} : no installationId`,
    );
  }
  console.log(
    `[${repository.full_name}] onGitHubEvent: ${
      event.id
    } ${eventName} : complete after ${Date.now() - start}ms`,
  );
}

export type WebhookIssueOpenedEvent = EmitterWebhookEvent<"issues"> & {
  payload: {
    action: "opened";
  };
};

type WebhookIssueCommentPullRequest =
  EmitterWebhookEvent<"issue_comment">["payload"]["issue"]["pull_request"];

export type WebhookPRCommentCreatedEvent =
  EmitterWebhookEvent<"issue_comment"> & {
    payload: {
      action: "created";
      issue: {
        pull_request: NonNullable<WebhookIssueCommentPullRequest>;
      };
    };
  };

type WebhookPullRequestOpenedEvent = EmitterWebhookEvent<"pull_request"> & {
  payload: {
    action: "opened";
  };
};

export type WebhookPullRequestReviewWithCommentsSubmittedEvent =
  EmitterWebhookEvent<"pull_request_review"> & {
    payload: {
      action: "submitted";
      review: {
        state: "changes_requested" | "commented";
      };
    };
  };

export type WebhookInstallationRepositoriesAddedEvent =
  EmitterWebhookEvent<"installation_repositories"> & {
    payload: {
      action: "added";
    };
  };

export type WebhookQueuedEvent =
  | WebhookIssueOpenedEvent
  | WebhookPRCommentCreatedEvent
  | WebhookPullRequestOpenedEvent
  | WebhookPullRequestReviewWithCommentsSubmittedEvent
  | WebhookInstallationRepositoriesAddedEvent;

type WithOctokit<T> = T & {
  octokit: Octokit;
};

export type WebhookPRCommentCreatedEventWithOctokit =
  WithOctokit<WebhookPRCommentCreatedEvent>;

export type WebhookPullRequestReviewWithCommentsSubmittedEventWithOctokit =
  WithOctokit<WebhookPullRequestReviewWithCommentsSubmittedEvent>;

export const publishGitHubEventToQueue = async (
  event: WithOctokit<WebhookQueuedEvent>,
) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { octokit, ...eventWithoutOctokit } = event;
  channel?.sendToQueue(
    QUEUE_NAME,
    Buffer.from(JSON.stringify(eventWithoutOctokit)),
    {
      persistent: true,
    },
  );
  const repoName =
    "repository" in event.payload
      ? event.payload.repository.full_name
      : event.payload.repositories_added
          .map(({ full_name }) => full_name)
          .join(",");
  console.log(
    `[${repoName}] publishGitHubEventToQueue: ${event.id} ${event.name}`,
  );
};

if (process.env.NODE_ENV !== "test") {
  initRabbitMQ();
}
