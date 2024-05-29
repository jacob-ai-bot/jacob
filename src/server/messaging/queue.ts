import ampq, { type ConsumeMessage } from "amqplib";
import { type Octokit } from "@octokit/core";
import { type EmitterWebhookEvent } from "@octokit/webhooks";
import { type Repository } from "@octokit/webhooks-types";
import {
  type InstallationAccessTokenAuthentication,
  createAppAuth,
} from "@octokit/auth-app";

import { db } from "../db/db";
import { cloneRepo } from "../git/clone";
import { runBuildCheck } from "../build/node/check";
import { getSourceMap } from "../analyze/sourceMap";
import { createNewFile } from "../code/newFile";
import { editFiles } from "../code/editFiles";
import { getPR } from "../github/pr";
import { addCommentToIssue } from "../github/issue";
import { fixError } from "../code/fixError";
import { createStory } from "../code/createStory";
import { codeReview } from "../code/codeReview";
import { respondToCodeReview } from "../code/respondToCodeReview";
import {
  extractFilePathWithArrow,
  PRCommand,
  PR_COMMAND_VALUES,
  IssueCommand,
  ISSUE_COMMAND_VALUES,
  enumFromStringValue,
  getRepoSettings,
  extractIssueNumberFromBranchName,
} from "../utils";
import {
  addFailedWorkComment,
  addStartingWorkComment,
  addUnsupportedCommandComment,
} from "../github/comments";
import { createRepoInstalledIssue } from "../github/issue";
import { getFile } from "../github/repo";
import { posthogClient } from "../analytics/posthog";
import { emitTaskEvent } from "../utils/events";
import { TaskStatus, TaskSubType } from "~/server/db/enums";

const QUEUE_NAME = "github_event_queue";

const auth = createAppAuth({
  appId: process.env.GITHUB_APP_ID ?? "",
  privateKey: process.env.GITHUB_PRIVATE_KEY ?? "",
});

let channel: ampq.Channel | undefined;
const LOCALHOST_RABBITMQ_PORT = process.env.RABBITMQ_PORT ?? 5672;
const RABBITMQ_URL =
  process.env.RABBITMQ_URL ?? `amqp://localhost:${LOCALHOST_RABBITMQ_PORT}`;

export async function initRabbitMQ({ listener }: { listener: boolean }) {
  if (channel) {
    return;
  }

  try {
    const connection = await ampq.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Init queue with one hour consumer timeout to ensure
    // we have enough time to install, build, and test
    await channel.assertQueue(QUEUE_NAME, {
      durable: true,
      arguments: { "x-consumer-timeout": 60 * 60 * 1000 },
    });

    if (!listener) {
      return;
    }

    const onMessage = async (message: ConsumeMessage | null) => {
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
        console.error(`Error parsing or processing message: ${String(error)}`);
        channel?.ack(message);
      }
    };

    await channel.prefetch(1);
    await channel.consume(QUEUE_NAME, (msg) => void onMessage(msg), {
      noAck: false,
    });
    console.log(`Initialized RabbitMQ`);
  } catch (error) {
    console.error(`Error initializing RabbitMQ: ${String(error)}`);
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
  return project;
}

async function isNodeProject(
  repository: Pick<
    Repository,
    "owner" | "id" | "node_id" | "name" | "full_name" | "private"
  >,
  installationAuthentication: InstallationAccessTokenAuthentication,
): Promise<boolean> {
  // Check to see if the repo has a package.json file in the root
  // This is a simple way to determine if the repo is a Node.js project
  // We will need to remove this assumption if we want to support other languages
  try {
    const { data } = await getFile(
      {
        ...repository,
        owner: {
          ...repository.owner,
          name: repository.owner?.name ?? undefined,
          gravatar_id: repository.owner?.gravatar_id ?? "",
          type: repository.owner?.type,
        },
      },
      installationAuthentication.token,
      "package.json",
    );
    return !(data instanceof Array) && data.type === "file";
  } catch (e) {
    return false;
  }
}

async function authInstallation(installationId?: number) {
  if (installationId) {
    return auth({
      type: "installation",
      installationId,
    });
  }
}

async function onReposAdded(
  event:
    | WebhookInstallationRepositoriesAddedEvent
    | WebhookInstallationCreatedEvent,
) {
  const repos =
    event.name === "installation_repositories"
      ? event.payload.repositories_added
      : event.payload.repositories ?? [];
  const { installation, sender } = event.payload;

  const installationAuthentication = await authInstallation(installation?.id);
  if (!installationAuthentication) {
    console.error(
      `onReposAdded: ${event.id} ${event.name} : no installationId`,
    );
    return;
  }
  for (const repo of repos) {
    console.log(
      `onReposAdded: ${event.id} ${event.name} : ${repo.full_name} ${repo.id}`,
    );
    const repository = { ...repo, owner: installation.account };
    const distinctId = sender.login ?? "";

    let isNodeRepo: boolean | undefined;
    try {
      isNodeRepo = await isNodeProject(repository, installationAuthentication);
      const project = await addProjectToDB(repo, event.id, event.name);
      const baseEventData = {
        projectId: project.id,
        repoFullName: repo.full_name,
        userId: distinctId,
      };
      const { path, cleanup } = await cloneRepo({
        baseEventData,
        repoName: repo.full_name,
        token: installationAuthentication.token,
      });

      console.log(`[${repo.full_name}] repo cloned to ${path}`);

      const repoSettings = getRepoSettings(path);

      try {
        if (isNodeRepo) {
          await runBuildCheck({
            ...baseEventData,
            path,
            afterModifications: false,
            repoSettings,
          });
        } else {
          console.log(
            `[${repo.full_name}] onReposAdded: ${event.id} ${event.name} : not a Node.js project - skipping runBuildCheck`,
          );
        }

        await createRepoInstalledIssue(
          repository,
          installationAuthentication.token,
          sender.login,
          isNodeRepo,
        );
        posthogClient.capture({
          distinctId,
          event: "Repo Installed Successfully",
          properties: {
            repo: repo.full_name,
          },
        });
      } finally {
        console.log(`[${repo.full_name}] cleaning up repo cloned to ${path}`);
        await cleanup();
      }
    } catch (error) {
      try {
        await createRepoInstalledIssue(
          repository,
          installationAuthentication.token,
          sender.login,
          isNodeRepo,
          error as Error,
        );
        posthogClient.capture({
          distinctId,
          event: "Repo Install Failed",
          properties: {
            repo: repo.full_name,
          },
        });
      } catch (issueError) {
        // NOTE: some repos don't have issues and we will fail to create an issue
        // Ignoring this error so we can continue to process the next repo and remove this event from the queue
        console.error(
          `[${repo.full_name}] onReposAdded: ${event.id} ${event.name} : ${String(issueError)}, original error:`,
          error,
        );
        posthogClient.capture({
          distinctId,
          event: "Repo Issue Creation Failed",
          properties: {
            repo: repo.full_name,
          },
        });
      }
    }
  }
}

export async function onGitHubEvent(event: WebhookQueuedEvent) {
  if (
    event.name === "installation_repositories" ||
    event.name === "installation"
  ) {
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
  const logEventDuration = () => {
    console.log(
      `[${repository.full_name}] onGitHubEvent: ${
        event.id
      } ${eventName} : complete after ${Date.now() - start}ms`,
    );
  };

  const project = await addProjectToDB(repository, event.id, eventName);

  const installationAuthentication = await authInstallation(installation?.id);
  if (!installationAuthentication) {
    console.error(
      `[${repository.full_name}] onGitHubEvent: ${event.id} ${eventName} : no installationId`,
    );
    logEventDuration();
    return;
  }

  const issueOpened = eventName === "issues";
  const issueOpenedTitle = issueOpened ? event.payload.issue.title : undefined;
  const prOpened = eventName === "pull_request";
  const prComment =
    eventName === "issue_comment" && event.payload.issue?.pull_request;
  const issueComment = eventName === "issue_comment";
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
  const distinctId =
    eventName === "pull_request"
      ? event.payload.pull_request.user.login
      : eventName === "issues"
        ? event.payload.issue.user.login
        : eventName === "pull_request_review"
          ? event.payload.review.user.login
          : eventName === "issue_comment"
            ? event.payload.comment.user.login
            : "";

  const baseEventData = {
    projectId: project.id,
    repoFullName: repository.full_name,
    userId: distinctId,
    issueId:
      eventName === "issues" || eventName === "issue_comment"
        ? event.payload.issue.number
        : undefined,
    pullRequestId:
      eventName === "pull_request" || eventName === "pull_request_review"
        ? event.payload.pull_request.number
        : undefined,
  };

  const prCommand = enumFromStringValue(
    PRCommand,
    prOpened || prComment
      ? PR_COMMAND_VALUES.find((cmd) => body?.includes(cmd))
      : undefined,
  );

  const issueCommand = enumFromStringValue(
    IssueCommand,
    issueComment
      ? ISSUE_COMMAND_VALUES.find((cmd) => body?.includes(cmd))
      : undefined,
  );

  if (prCommand && issueOpened) {
    throw new Error(
      "prCommand unexpected while handling queued issue opened event",
    );
  }

  if (issueComment && !prCommand && !issueCommand) {
    await addUnsupportedCommandComment(
      repository,
      eventIssueOrPRNumber,
      installationAuthentication.token,
    );
    logEventDuration();
    return;
  }

  const startingWorkParams = {
    repository,
    token: installationAuthentication.token,
  };

  if (prCommand) {
    await addStartingWorkComment({
      ...startingWorkParams,
      task: "prCommand",
      prNumber: eventIssueOrPRNumber,
      prCommand,
    });
  } else if (issueCommand && issueCommand) {
    await addStartingWorkComment({
      ...startingWorkParams,
      task: "issueCommand",
      issueCommand,
      issueNumber: eventIssueOrPRNumber,
    });
  } else if (prReview) {
    await addStartingWorkComment({
      ...startingWorkParams,
      task: "prReview",
      prNumber: eventIssueOrPRNumber,
    });
  } else if (issueOpened) {
    await addStartingWorkComment({
      ...startingWorkParams,
      task: "issueOpened",
      issueNumber: eventIssueOrPRNumber,
    });
  } else if (prOpened && !prCommand) {
    // We frequently create PRs with copied issue text, so we see @jacob-ai-bot
    // without a command. For now, we will ignore the mention without a command
    // in all PR opened events.
    console.log("Quietly ignoring PR opened event without command");
    logEventDuration();
    return;
  } else {
    throw new Error("Unexpected event type");
  }

  let existingPr: Awaited<ReturnType<typeof getPR>>["data"] | undefined;
  let prBranch: string | undefined;
  if (!!prComment || prReview || prOpened) {
    const result = await getPR(
      repository,
      installationAuthentication.token,
      eventIssueOrPRNumber,
    );
    existingPr = result.data;
    prBranch = existingPr.head.ref;
    if (baseEventData.issueId) {
      console.error("Unexpected issueId when handling PR event");
    }
    baseEventData.issueId = extractIssueNumberFromBranchName(prBranch);
  }

  const newFileName = issueOpenedTitle
    ? extractFilePathWithArrow(issueOpenedTitle)
    : undefined;

  if (issueOpened) {
    await emitTaskEvent({
      ...baseEventData,
      issue: event.payload.issue,
      subType: newFileName
        ? TaskSubType.CREATE_NEW_FILE
        : TaskSubType.EDIT_FILES,
      status: TaskStatus.IN_PROGRESS,
    });
  }

  try {
    const { path, cleanup } = await cloneRepo({
      baseEventData,
      repoName: repository.full_name,
      branch: prBranch,
      token: installationAuthentication.token,
    });

    console.log(`[${repository.full_name}] repo cloned to ${path}`);

    const repoSettings = getRepoSettings(path);

    try {
      if (issueOpened) {
        // Ensure that we capture a source map BEFORE we run the build check.
        // Once npm install has been run, the source map becomes much more
        // detailed and is too large for our LLM context window.
        const sourceMap = getSourceMap(path, repoSettings);
        await runBuildCheck({
          ...baseEventData,
          path,
          afterModifications: false,
          repoSettings,
        });

        if (newFileName) {
          await createNewFile({
            ...baseEventData,
            newFileName,
            repository,
            token: installationAuthentication.token,
            issue: event.payload.issue,
            rootPath: path,
            sourceMap,
            repoSettings,
          });
          posthogClient.capture({
            distinctId,
            event: "New File Created",
            properties: {
              repo: repository.full_name,
              file: newFileName,
            },
          });
        } else {
          await editFiles({
            ...baseEventData,
            repository,
            token: installationAuthentication.token,
            issue: event.payload.issue,
            rootPath: path,
            sourceMap,
            repoSettings,
          });
          posthogClient.capture({
            distinctId,
            event: "Files Edited",
            properties: {
              repo: repository.full_name,
            },
          });
        }
      } else if (prReview) {
        if (!prBranch || !existingPr) {
          throw new Error("prBranch and existingPr when handling prReview");
        }
        await respondToCodeReview({
          ...baseEventData,
          repository,
          token: installationAuthentication.token,
          rootPath: path,
          repoSettings,
          branch: prBranch,
          existingPr,
          state: event.payload.review.state,
          reviewBody: body,
        });
        posthogClient.capture({
          distinctId,
          event: "Code Review Responded",
          properties: {
            repo: repository.full_name,
            pr: prBranch,
          },
        });
      } else if (prCommand) {
        if (!prBranch || !existingPr) {
          throw new Error("prBranch and existingPr when handling prCommand");
        }
        switch (prCommand) {
          case PRCommand.CreateStory:
            await createStory({
              ...baseEventData,
              repository,
              token: installationAuthentication.token,
              rootPath: path,
              branch: prBranch,
              repoSettings,
              existingPr,
            });
            posthogClient.capture({
              distinctId,
              event: "Story Created",
              properties: {
                repo: repository.full_name,
                pr: prBranch,
              },
            });
            break;
          case PRCommand.CodeReview:
            await codeReview({
              ...baseEventData,
              repository,
              token: installationAuthentication.token,
              rootPath: path,
              branch: prBranch,
              repoSettings,
              existingPr,
            });
            posthogClient.capture({
              distinctId,
              event: "Code Review Started",
              properties: {
                repo: repository.full_name,
                pr: prBranch,
              },
            });
            break;
          case PRCommand.Build:
            await runBuildCheck({
              ...baseEventData,
              path,
              afterModifications: false,
              repoSettings,
            });
            await addCommentToIssue(
              repository,
              eventIssueOrPRNumber,
              installationAuthentication.token,
              "Good news!\n\nThe build was successful! :tada:",
            );
            break;
          case PRCommand.FixError:
            await fixError({
              ...baseEventData,
              repository,
              token: installationAuthentication.token,
              prIssue:
                eventName === "pull_request" ? null : event.payload.issue,
              body:
                eventName === "pull_request"
                  ? event.payload.pull_request.body
                  : event.payload.comment.body,
              rootPath: path,
              branch: prBranch,
              existingPr,
              repoSettings,
            });
            posthogClient.capture({
              distinctId,
              event: "Error Fix Started",
              properties: {
                repo: repository.full_name,
                pr: prBranch,
              },
            });
            break;
        }
      } else if (issueComment) {
        switch (issueCommand) {
          case IssueCommand.Build:
            await runBuildCheck({
              ...baseEventData,
              path,
              afterModifications: false,
              repoSettings,
            });
            await addCommentToIssue(
              repository,
              eventIssueOrPRNumber,
              installationAuthentication.token,
              "Good news!\n\nThe build was successful! :tada:",
            );
            break;
        }
      }
    } finally {
      console.log(
        `[${repository.full_name}] cleaning up repo cloned to ${path}`,
      );
      await cleanup();
    }
  } catch (error) {
    await addFailedWorkComment(
      repository,
      eventIssueOrPRNumber,
      installationAuthentication.token,
      issueOpened,
      prReview,
      error as Error,
    );
    posthogClient.capture({
      distinctId,
      event: "Work Failed",
      properties: {
        repo: repository.full_name,
        branch: prBranch,
        issue: eventIssueOrPRNumber,
      },
    });
  }
  logEventDuration();
}

export type WebhookIssueOpenedEvent = EmitterWebhookEvent<"issues"> & {
  payload: {
    action: "opened";
  };
};

export type WebhookIssueEditedEvent = EmitterWebhookEvent<"issues"> & {
  payload: {
    action: "edited";
  };
};

export type WebhookIssueCommentCreatedEvent =
  EmitterWebhookEvent<"issue_comment"> & {
    payload: {
      action: "created";
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

export type WebhookPullRequestOpenedEvent =
  EmitterWebhookEvent<"pull_request"> & {
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

export type WebhookInstallationCreatedEvent =
  EmitterWebhookEvent<"installation"> & {
    payload: {
      action: "created";
    };
  };

export type WebhookQueuedEvent =
  | WebhookIssueOpenedEvent
  | WebhookIssueEditedEvent
  | WebhookIssueCommentCreatedEvent
  | WebhookPRCommentCreatedEvent
  | WebhookPullRequestOpenedEvent
  | WebhookPullRequestReviewWithCommentsSubmittedEvent
  | WebhookInstallationRepositoriesAddedEvent
  | WebhookInstallationCreatedEvent;

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
  await initRabbitMQ({ listener: false });
  if (!channel) {
    console.error(
      `publishGitHubEventToQueue: ${event.id} ${event.name} : NO CHANNEL`,
    );
    return;
  }
  console.log(`publishGitHubEventToQueue: ${event.id} ${event.name}`);
  channel.sendToQueue(
    QUEUE_NAME,
    Buffer.from(JSON.stringify(eventWithoutOctokit)),
    {
      persistent: true,
    },
  );
  const repoName =
    "repository" in event.payload
      ? event.payload.repository.full_name
      : ("repositories_added" in event.payload
          ? event.payload.repositories_added
          : event.payload.repositories ?? []
        )
          .map(({ full_name }) => full_name)
          .join(",");
  console.log(
    `[${repoName}] publishGitHubEventToQueue: ${event.id} ${event.name}`,
  );
};
