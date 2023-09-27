import ampq from "amqplib";
import { EmitterWebhookEvent } from "@octokit/webhooks";

import { db } from "../src/db/db";
import { cloneRepo } from "../src/github/clone";

const QUEUE_NAME = "github_event_queue";

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
          console.error(`Error parsing message: ${error}`);
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
      payload: { repository },
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

    const { path, cleanup } = await cloneRepo(repository.full_name);
    console.log(`cleaning up repo cloned to ${path}`);
    cleanup();
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

export const publishGitHubEventToQueue = async (event: EmitterWebhookEvent) => {
  channel?.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(event)), {
    persistent: true,
  });
  console.log(`publishGitHubEventToQueue: ${event.id} ${event.name}`);
};

initRabbitMQ();
