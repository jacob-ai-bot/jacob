import ampq from "amqplib";
import { Octokit } from "@octokit/core";
import { EmitterWebhookEvent } from "@octokit/webhooks";
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
} from "../utils";
import {
  addFailedWorkComment,
  addStartingWorkComment,
} from "../github/comments";

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

export async function onGitHubEvent(event: WebhookQueuedEvent) {
  const eventName = event.name;
  const start = Date.now();
  console.log(`onGitHubEvent: ${event.id} ${eventName}`);

  const {
    payload: { repository, installation },
  } = event;
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
    `onGitHubEvent: ${event.id} ${eventName} : DB project ID: ${project.id}`,
  );

  const installationId = installation?.id;
  if (installationId) {
    const installationAuthentication = await auth({
      type: "installation",
      installationId,
    });

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

    const { path, cleanup } = await cloneRepo(
      repository.full_name,
      prBranch,
      installationAuthentication.token,
    );

    console.log(`repo cloned to ${path}`);

    try {
      if (issueOpened) {
        await runBuildCheck(path);

        const issueTitle = event.payload.issue.title;

        const newFileName = extractFilePathWithArrow(issueTitle);
        if (newFileName) {
          await createNewFile(
            newFileName,
            repository,
            installationAuthentication.token,
            event.payload.issue,
            path,
          );
        } else {
          await editFiles(
            repository,
            installationAuthentication.token,
            event.payload.issue,
            path,
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
              existingPr,
            );
            break;
          case PRCommand.CodeReview:
            await codeReview(
              repository,
              installationAuthentication.token,
              path,
              prBranch,
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
              existingPr,
            );
            break;
        }
      }
    } catch (error) {
      await addFailedWorkComment(
        repository,
        eventIssueOrPRNumber,
        installationAuthentication.token,
        error as Error,
      );
    } finally {
      console.log(`cleaning up repo cloned to ${path}`);
      cleanup();
    }
  } else {
    console.error(
      `onGitHubEvent: ${event.id} ${eventName} : no installationId`,
    );
  }
  console.log(
    `onGitHubEvent: ${event.id} ${eventName} : complete after ${
      Date.now() - start
    }ms`,
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

type WebhookPullRequestReviewWithCommentsSubmittedEvent =
  EmitterWebhookEvent<"pull_request_review"> & {
    payload: {
      action: "submitted";
      review: {
        state: "changes_requested" | "commented";
      };
    };
  };

export type WebhookQueuedEvent =
  | WebhookIssueOpenedEvent
  | WebhookPRCommentCreatedEvent
  | WebhookPullRequestOpenedEvent
  | WebhookPullRequestReviewWithCommentsSubmittedEvent;

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
  console.log(`publishGitHubEventToQueue: ${event.id} ${event.name}`);
};

if (process.env.NODE_ENV !== "test") {
  initRabbitMQ();
}
