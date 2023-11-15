import ampq from "amqplib";
import { Octokit } from "@octokit/core";
import { EmitterWebhookEvent } from "@octokit/webhooks";
import { createAppAuth } from "@octokit/auth-app";

import { db } from "../db/db";
import { cloneRepo } from "../git/clone";
import { runBuildCheck, runNpmInstall } from "../build/node/check";
import { createNewFile } from "../code/newFile";
import { editFiles } from "../code/editFiles";
import { assessBuildError } from "../code/assessBuildError";
import { addCommentToIssue } from "../github/issue";
import { getPR } from "../github/pr";
import { checkAndCommit } from "../code/checkAndCommit";

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
  if (event.name === "issues" || event.name === "issue_comment") {
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

    const installationId = installation?.id;
    if (installationId) {
      const installationAuthentication = await auth({
        type: "installation",
        installationId,
      });

      const issueOpened =
        event.name === "issues" && event.payload.action === "opened";
      const issueLabeled =
        event.name === "issues" && event.payload.action === "labeled";
      const prCommentBuildError =
        event.name === "issue_comment" &&
        event.payload.action === "created" &&
        event.payload.issue.pull_request &&
        event.payload.comment.body?.includes("@otto fix build error");

      if (issueOpened || issueLabeled || prCommentBuildError) {
        const issueNumber = event.payload.issue.number;

        if (issueOpened || issueLabeled) {
          const message = `Otto here...\n\nYou mentioned me on this issue and I am busy taking a look at it.\n\nI'll continue to comment on this issue with status as I make progress.`;
          await addCommentToIssue(
            repository,
            event.payload.issue.number,
            installationAuthentication.token,
            message,
          );
        } else if (prCommentBuildError) {
          const message = `Otto here...\n\nI'm busy working on this build error.\n\nI'll continue to comment on this pull request with status as I make progress.`;
          await addCommentToIssue(
            repository,
            issueNumber,
            installationAuthentication.token,
            message,
          );
        }

        let existingPr: Awaited<ReturnType<typeof getPR>>["data"] | undefined;
        let prBranch: string | undefined;
        if (prCommentBuildError) {
          const result = await getPR(
            repository,
            installationAuthentication.token,
            issueNumber,
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
          }
          if (prCommentBuildError) {
            if (!prBranch || !existingPr) {
              throw new Error("prBranch and existingPr required");
            }
            const { body } = event.payload.comment;

            const buildErrorSection = (body?.split("## Error Message:\n\n") ??
              [])[1];
            const buildError = (buildErrorSection ?? "").split("## ")[0];

            const assessment = await assessBuildError(buildError);
            console.log("Assessment of Error:", assessment);

            if (assessment.needsNpmInstall && assessment.npmPackageToInstall) {
              console.log("Needs npm install");

              await runNpmInstall(path, assessment.npmPackageToInstall.trim());

              await checkAndCommit({
                repository,
                token: installationAuthentication.token,
                rootPath: path,
                branch: prBranch,
                commitMessage: "Otto commit: fix build error",
                existingPrNumber: issueNumber,
                existingPrTitle: existingPr.title,
                existingPrUrl: existingPr.html_url,
              });
            } else {
              const message = `Otto here once again...\n\n
              Unfortunately, I wasn't able to resolve this build error.\n\n
              Here is some information about the error:\n\n${assessment.causeOfError}\n\n
              Here are some ideas for fixing the error:\n\n${assessment.ideasForFixingError}\n\n
              Here is the suggested fix:\n\n${assessment.suggestedFix}\n`;

              await addCommentToIssue(
                repository,
                issueNumber,
                installationAuthentication.token,
                message,
              );
            }
          }
        } catch (error) {
          const message = `Unfortunately, I ran into trouble working on this.\n\nHere is some error information:\n${
            (error as { message?: string })?.message ??
            (error as Error).toString()
          }\n\nI'll try again in a few minutes.`;
          await addCommentToIssue(
            repository,
            issueNumber,
            installationAuthentication.token,
            message,
          );
        } finally {
          console.log(`cleaning up repo cloned to ${path}`);
          cleanup();
        }
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
