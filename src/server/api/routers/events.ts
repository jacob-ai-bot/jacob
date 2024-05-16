import { z } from "zod";
import { db } from "~/server/db/db";
import { TaskType, type TodoStatus } from "~/server/db/enums";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

import { TaskStatus, TaskSubType } from "~/server/db/enums";
import { type Language } from "~/types";
import { getIssue, getPlanForTaskSubType, validateRepo } from "../utils";
import { getSnapshotUrl } from "~/app/utils";
import { extractFilePathWithArrow } from "~/server/utils";

import { observable } from "@trpc/server/observable";

import {
  type Event,
  type Task as EventsTask,
  EventsTable,
} from "~/server/db/tables/events.table";
import { newRedisConnection } from "~/server/utils/redis";
import { type ExtractedIssueInfo } from "~/server/code/extractedIssue";

export interface Task extends EventsTask {
  issueId: number;
  imageUrl?: string;
  currentPlanStep?: number;
  statusDescription?: string;
  plan?: Plan[];
  issue?: Issue;
  pullRequest?: PullRequest;
  commands?: Command[];
  codeFiles?: Code[];
  prompts?: Prompt[];
}

export type Code = {
  type: TaskType.code;
  fileName: string;
  filePath: string;
  language?: Language;
  codeBlock: string;
};

export type Design = {
  type: TaskType.design;
};

export type Terminal = {
  type: TaskType.terminal;
};

export type Plan = {
  type: TaskType.plan;
  id?: string;
  title: string;
  description: string;
  position: number;
  isComplete: boolean;
};

export type Prompt = {
  type: TaskType.prompt;
  metadata: {
    timestamp: string;
    cost: number;
    tokens: number;
    duration: number;
    model: string;
  };
  request: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prompts: ReturnType<any>[];
  };
  response: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prompt: ReturnType<any>;
  };
};

export type Issue = {
  type: TaskType.issue;
  id: string;
  issueId: number;
  title: string;
  description: string;
  createdAt: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  comments: ReturnType<any>[];
  author: string;
  assignee: string;
  status: "open" | "closed";
  link: string;
  stepsToAddressIssue?: string | null;
  issueQualityScore?: number | null;
  commitTitle?: string | null;
  filesToCreate?: string[] | null;
  filesToUpdate?: string[] | null;
};

export type PullRequest = {
  type: TaskType.pull_request;
  pullRequestId: number;
  title: string;
  description: string | null;
  link: string;
  status: "open" | "closed" | "merged";
  createdAt: string;
  author: string;
};

export type Command = {
  type: TaskType.command;
  command: string;
  response: string;
  directory: string;
  exitCode: number | null;
};

type EventPayload =
  | Task
  | Code
  | Design
  | Terminal
  | Plan
  | Prompt
  | Issue
  | PullRequest
  | Command;

export interface Todo extends ExtractedIssueInfo {
  id: string;
  description: string;
  name: string;
  status: TodoStatus;
  issueId?: number;
}

export const eventsRouter = createTRPCRouter({
  getEventPayload: protectedProcedure
    .input(
      z.object({
        org: z.string(),
        repo: z.string(),
        type: z.nativeEnum(TaskType),
      }),
    )
    .query(
      async ({
        input: { org, repo, type },
        ctx: {
          session: { accessToken },
        },
      }) => {
        await validateRepo(org, repo, accessToken);
        const events = await db.events
          .where({ type })
          .where({ repoFullName: `${org}/${repo}` });

        return events.map((e) => e.payload as EventPayload);
      },
    ),
  getTasks: protectedProcedure
    .input(
      z.object({
        org: z.string(),
        repo: z.string(),
      }),
    )
    .query(
      async ({
        input: { org, repo },
        ctx: {
          session: { accessToken },
        },
      }) => {
        await validateRepo(org, repo, accessToken);

        // Fetch all events from the repo matching the `TaskType.issue`
        const events = await db.events
          .where({ repoFullName: `${org}/${repo}` })
          .order({
            createdAt: "DESC",
          });

        // Extract unique issue IDs
        const uniqueIssueIds = [
          ...new Set(events.map((e) => e.issueId)),
        ].filter((issueId) => issueId);

        // Use the unique issue IDs to create a list of tasks
        const tasks = await Promise.all(
          (uniqueIssueIds.filter(Boolean) as number[]).map(async (issueId) => {
            // Each task should have a single issue. Get the most recent issue
            let issue = events.find((e) => e.type === TaskType.issue)
              ?.payload as Issue;

            if (!issue && org && repo && issueId && accessToken) {
              // Fetch the issue from the GitHub API using Octokit
              issue = await getIssue(org, repo, issueId, accessToken);
            }
            return createTaskForIssue(issue, events, `${org}/${repo}`);
          }),
        );

        return tasks;
      },
    ),

  onAdd: protectedProcedure.subscription(() => {
    // return an `observable` with a callback which is triggered immediately
    return observable<Event>((emit) => {
      const onRedisMessage = (_channel: string, message: string) => {
        try {
          emit.next(JSON.parse(message) as Event);
        } catch (error) {
          console.error("Failed to parse event in redis message", {
            message,
            error,
          });
        }
      };

      // trigger `onAdd()` when `add` is triggered in our event emitter
      const redisConnection = newRedisConnection();
      void redisConnection
        .subscribe("events", (err, count) => {
          if (err) {
            // Just like other commands, subscribe() can fail for some reasons,
            // ex network issues.
            console.error("Failed to subscribe:", err);
          } else {
            // `count` represents the number of channels this client are currently subscribed to.
            console.log(
              `Subscribed successfully! This client is currently subscribed to ${String(count)} channels.`,
            );
          }
        })
        .then(() => {
          redisConnection.on("message", onRedisMessage);
        });

      // unsubscribe function when client disconnects or stops subscribing
      return () => {
        void redisConnection.quit();
      };
    });
  }),
  add: protectedProcedure
    .input(
      EventsTable.schema().omit({ id: true, createdAt: true, updatedAt: true }),
    )
    .mutation(async (opts) => {
      const event = { ...opts.input }; /* [..] add to db */
      const redisPub = newRedisConnection();
      await redisPub.publish("events", JSON.stringify(event));
      await redisPub.quit();
      return event;
    }),
});

const createTaskForIssue = (issue: Issue, events: Event[], repo: string) => {
  const issueId = issue.issueId;
  const newFileName = extractFilePathWithArrow(issue.title);
  const taskSubType = newFileName
    ? TaskSubType.CREATE_NEW_FILE
    : TaskSubType.EDIT_FILES;
  if (newFileName) {
    issue.filesToCreate = [newFileName];
  }

  const plan = getPlanForTaskSubType(taskSubType);

  // Each issue should have a single pull request. Get the most recent pull request
  const pullRequest = events.find((e) => e.type === TaskType.pull_request)
    ?.payload as PullRequest;

  // Get the most recent code event for each unique 'code.fileName' associated with the issue
  const codeFiles = events
    .filter((e) => e.type === TaskType.code && e.issueId === issueId)
    .map((e) => e.payload as Code)
    .reduce<Code[]>((acc, code) => {
      if (!acc.some((c) => c.fileName === code.fileName)) {
        acc.push(code);
      }
      return acc;
    }, []);

  // Get the commands associated with the issue, sorted from least to most recent
  const commands = events
    .filter((e) => e.type === TaskType.command && e.issueId === issueId)
    .map((e) => e.payload as Command)
    .reverse();

  // Get the prompts associated with the issue
  const prompts = events
    .filter((e) => e.type === TaskType.prompt && e.issueId === issueId)
    .map((e) => e.payload as Prompt);

  let imageUrl = "";
  if (issue) {
    imageUrl = getSnapshotUrl(issue.description) ?? "";
  }

  return {
    id: `task-${issueId}`,
    issueId,
    type: TaskType.task,
    repo,
    name: issue?.title ?? "New Task",
    subType: taskSubType,
    description: issue.description,
    status: issue.status === "open" ? TaskStatus.IN_PROGRESS : TaskStatus.DONE,
    storyPoints: 1, // TODO: Calculate story points
    imageUrl,
    issue,
    plan,
    pullRequest,
    commands,
    codeFiles,
    prompts,
  } as Task;
};
