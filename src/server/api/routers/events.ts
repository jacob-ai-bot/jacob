import { z } from "zod";
import { db } from "~/server/db/db";
import { TaskType } from "~/server/db/enums";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { validateRepo } from "../utils";
import {
  type TaskSubType,
  type TaskStatus,
} from "~/server/db/tables/events.table";
import { type Language } from "~/types";

type Task = {
  type: TaskType.task;
  id: string;
  name: string;
  subType: TaskSubType;
  description: string;
  storyPoints: number;
  status: TaskStatus;
};

type Code = {
  type: TaskType.code;
  fileName: string;
  filePath: string;
  language?: Language;
  codeBlock: string;
};

type Design = {
  type: TaskType.design;
};

type Terminal = {
  type: TaskType.terminal;
};

type Plan = {
  type: TaskType.plan;
  id?: string;
  title: string;
  description: string;
  position: number;
  isComplete: boolean;
};

type Prompt = {
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

type Issue = {
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

type PullRequest = {
  type: TaskType.pull_request;
  pullRequestId: number;
  title: string;
  description: string | null;
  link: string;
  status: "open" | "closed" | "merged";
  createdAt: string;
  author: string;
};

type Command = {
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
          session: { user },
        },
      }) => {
        // Check to ensure that the user has access to the repo
        await validateRepo(org, repo);
        const events = await db.events
          .where({ type })
          .where({ userId: user.id })
          .where({ repoFullName: `${org}/${repo}` });

        return events.map((e) => e.payload as EventPayload);
      },
    ),
});
