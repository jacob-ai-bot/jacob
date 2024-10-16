import { type Issue } from "@octokit/webhooks-types";
import { DateTime } from "luxon";

import { db } from "~/server/db/db";
import { TaskType, type TaskSubType, type TaskStatus } from "~/server/db/enums";
import { type BaseEventData, getLanguageFromFileName } from "~/server/utils";
import type { PullRequest } from "~/server/code/checkAndCommit";
import { newRedisConnection } from "./redis";
import { type RetrievedIssue } from "~/server/code/checkAndCommit";
import { type Plan, type PlanStep } from "~/server/agent/plan";

export const EVENT_RETENTION_TIME_IN_SECONDS = 14 * 24 * 60 * 60;

export function purgeEvents() {
  return db.events
    .where({
      createdAt: {
        lte: DateTime.now()
          .minus({
            seconds: EVENT_RETENTION_TIME_IN_SECONDS,
          })
          .toISO() as unknown as number,
      },
    })
    .delete();
}

const redisConnection = newRedisConnection();

interface EmitCodeEventParams extends BaseEventData {
  fileName: string;
  filePath: string;
  codeBlock: string;
}

export async function emitCodeEvent(params: EmitCodeEventParams) {
  const { fileName, filePath, codeBlock, ...baseEventData } = params;
  const event = await db.events.selectAll().insert({
    ...baseEventData,
    type: TaskType.code,
    payload: {
      type: TaskType.code,
      fileName,
      filePath,
      codeBlock,
      language: getLanguageFromFileName(fileName),
    },
  });
  await redisConnection.publish("events", JSON.stringify(event));
}

interface EmitPREventParams extends BaseEventData {
  pullRequest: PullRequest;
}

export async function emitPREvent(params: EmitPREventParams) {
  const { pullRequest, ...baseEventData } = params;
  const event = await db.events.selectAll().insert({
    ...baseEventData,
    type: TaskType.pull_request,
    payload: {
      type: TaskType.pull_request,
      pullRequestId: pullRequest.number,
      title: pullRequest.title,
      description: pullRequest.body,
      link: pullRequest.html_url,
      status: pullRequest.state,
      createdAt: pullRequest.created_at,
      author: pullRequest.user.login,
    },
  });
  await redisConnection.publish("events", JSON.stringify(event));
}

interface EmitPlanEventParams extends BaseEventData {
  plan: Plan;
}

export async function emitPlanEvent(params: EmitPlanEventParams) {
  const { plan, ...baseEventData } = params;
  const event = await db.events.selectAll().insert({
    ...baseEventData,
    type: TaskType.plan,
    payload: {
      type: TaskType.plan,
      steps: plan.steps.map(({ type: actionType, ...restOfPlanStep }) => ({
        type: TaskType.plan_step as TaskType.plan_step,
        actionType,
        exitCriteria: restOfPlanStep.exitCriteria ?? "",
        dependencies: restOfPlanStep.dependencies ?? "",
        ...restOfPlanStep,
      })),
    },
  });
  await redisConnection.publish("events", JSON.stringify(event));
}

interface EmitPlanStepEventParams extends BaseEventData {
  planStep: PlanStep;
}

export async function emitPlanStepEvent(params: EmitPlanStepEventParams) {
  const { planStep, ...baseEventData } = params;
  const { type: actionType, ...restOfPlanStep } = planStep;
  const event = await db.events.selectAll().insert({
    ...baseEventData,
    type: TaskType.plan_step,
    payload: {
      type: TaskType.plan_step,
      actionType,
      exitCriteria: restOfPlanStep.exitCriteria ?? "",
      dependencies: restOfPlanStep.dependencies ?? "",
      ...restOfPlanStep,
    },
  });
  await redisConnection.publish("events", JSON.stringify(event));
}

interface EmitTaskEventParams extends BaseEventData {
  issue?: Issue | RetrievedIssue;
  subType: TaskSubType;
  status: TaskStatus;
  statusMessage?: string;
}

export async function emitTaskEvent(params: EmitTaskEventParams) {
  const { issue, subType, status, statusMessage, ...baseEventData } = params;
  const issueNumber = baseEventData.issueId ?? issue?.number;
  if (!issueNumber) {
    console.warn("No issue number provided for task event", baseEventData);
  }
  const event = await db.events.selectAll().insert({
    ...baseEventData,
    type: TaskType.task,
    payload: {
      type: TaskType.task,
      id: `task-${baseEventData.repoFullName}-${issueNumber}`,
      name: issue?.title,
      description: issue?.body ?? undefined,
      storyPoints: 1,
      status,
      subType,
      statusMessage,
    },
  });
  await redisConnection.publish("events", JSON.stringify(event));
}

interface EmitCommandEventParams extends BaseEventData {
  command: string;
  directory: string;
  response: string;
  exitCode: number | null;
}

export async function emitCommandEvent(params: EmitCommandEventParams) {
  const { command, directory, response, exitCode, ...baseEventData } = params;
  const event = await db.events.selectAll().insert({
    ...baseEventData,
    type: TaskType.command,
    payload: {
      type: TaskType.command,
      directory,
      command,
      response,
      exitCode,
    },
  });
  await redisConnection.publish("events", JSON.stringify(event));
}

interface EmitPromptEventParams extends BaseEventData {
  tokens: number;
  model: string;
  cost: number;
  duration: number;
  requestPrompts: {
    promptType: "User" | "System" | "Assistant";
    prompt: string;
  }[];
  responsePrompt: string;
}

export async function emitPromptEvent(params: EmitPromptEventParams) {
  const {
    cost,
    tokens,
    model,
    duration,
    requestPrompts,
    responsePrompt,
    ...baseEventData
  } = params;
  const timestamp = new Date().toISOString();

  const event = await db.events.selectAll().insert({
    ...baseEventData,
    type: TaskType.prompt,
    payload: {
      type: TaskType.prompt,
      metadata: {
        timestamp,
        cost,
        tokens,
        duration,
        model,
      },
      request: {
        prompts: requestPrompts.map((prompt) => ({
          ...prompt,
          timestamp,
        })),
      },
      response: {
        prompt: {
          promptType: "Assistant",
          prompt: responsePrompt,
          timestamp,
        },
      },
    },
  });
  await redisConnection.publish("events", JSON.stringify(event));
}
