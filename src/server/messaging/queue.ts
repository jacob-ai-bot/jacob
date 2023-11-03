import ampq from "amqplib";
import { Octokit } from "@octokit/core";
import { EmitterWebhookEvent } from "@octokit/webhooks";
import { createAppAuth } from "@octokit/auth-app";

import { db } from "../db/db";
import { cloneRepo } from "../git/clone";
import { runBuildCheck } from "../build/node/check";
import { createNewFile } from "../code/newFile";
import { addCommentToIssue } from "../github/issue";

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
        try {
          const event = JSON.parse(
            message.content.toString(),
          ) as EmitterWebhookEvent;
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

export const extractFilePathWithArrow = (title?: string) => {
  if (!title) return null;
  const regex = /=>\s*(.+)/; // This regex matches "=>" followed by optional spaces and a file name with an extension
  const match = title.match(regex);

  return match ? match[1]?.trim() : null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function onGitHubEvent(event: EmitterWebhookEvent) {
  const start = Date.now();
  console.log(`onGitHubEvent: ${event.id} ${event.name}`);
  if (
    event.name === "issues" ||
    event.name === "issue_comment" ||
    event.name === "pull_request_review" ||
    event.name === "pull_request_review_comment"
  ) {
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
      `onGitHubEvent: ${event.id} ${event.name} : DB project ID: ${project.id}`,
    );

    let branch: string | undefined;
    if (
      event.name === "pull_request_review" ||
      event.name === "pull_request_review_comment"
    ) {
      branch = event.payload.pull_request.head.ref;
    }

    const installationId = installation?.id;
    if (installationId) {
      const installationAuthentication = await auth({
        type: "installation",
        installationId,
      });

      if (event.name === "issues") {
        const message = `Otto here...\n\nYou mentioned me on this issue and I am busy taking a look at it.\n\nI'll continue to comment on this issue with status as I make progress.`;
        await addCommentToIssue(
          repository,
          event.payload.issue.number,
          installationAuthentication.token,
          message,
        );
      }

      const { path, cleanup } = await cloneRepo(
        repository.full_name,
        branch,
        installationAuthentication.token,
      );

      console.log(`repo cloned to ${path}`);

      try {
        await runBuildCheck(path);

        if (event.name === "issues" || event.name === "issue_comment") {
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
            // TODO: handle editing
            console.log("Need to handle editing files");
          }
        }
      } catch (error) {
        if (event.name === "issues") {
          const message = `Unfortunately, I ran into trouble working on this.\n\nHere is some error information:\n${
            (error as { message?: string })?.message ??
            (error as Error).toString()
          }\n\nI'll try again in a few minutes.`;
          await addCommentToIssue(
            repository,
            event.payload.issue.number,
            installationAuthentication.token,
            message,
          );
        }
      } finally {
        console.log(`cleaning up repo cloned to ${path}`);
        cleanup();
      }
    } else {
      console.error(
        `onGitHubEvent: ${event.id} ${event.name} : no installationId`,
      );
    }
  } else {
    const delay = Math.random() * 10000;
    await sleep(delay);
  }
  console.log(
    `onGitHubEvent: ${event.id} ${event.name} : complete after ${
      Date.now() - start
    }ms`,
  );
}
type GHEventWithOctokit = EmitterWebhookEvent & {
  octokit: Octokit;
};

export const publishGitHubEventToQueue = async (event: GHEventWithOctokit) => {
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

initRabbitMQ();
