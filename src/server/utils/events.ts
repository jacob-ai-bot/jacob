import { db } from "~/server/db/db";
import { TaskType } from "~/server/db/enums";
import { type BaseEventData, getLanguageFromFileName } from "~/server/utils";
import type { PullRequest } from "~/server/code/checkAndCommit";
import { newRedisConnection } from "./redis";

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
