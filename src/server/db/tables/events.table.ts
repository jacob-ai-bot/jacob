import { type JSONTypes } from "orchid-core";
import type { Selectable, Insertable, Updateable, Queryable } from "orchid-orm";
import { BaseTable } from "../baseTable";
import {
  TaskType,
  TaskStatus,
  TaskSubType,
  PlanningAgentActionType,
} from "../enums";
import { Language } from "~/types";

export type Event = Selectable<EventsTable>;
export type NewEvent = Insertable<EventsTable>;
export type EventUpdate = Updateable<EventsTable>;
export type EventQueryable = Queryable<EventsTable>;

const TASK_TYPE_VALUES = Object.values(TaskType) as [TaskType, ...TaskType[]];

export type Task = {
  type: TaskType.task;
  id: string;
  name?: string;
  subType: TaskSubType;
  description?: string;
  storyPoints: number;
  status: TaskStatus;
  statusMessage?: string;
};

const defineComment = (t: JSONTypes) =>
  t.object({
    id: t.string(),
    commentId: t.number(),
    username: t.string(),
    createdAt: t.string(),
    content: t.string(),
  });

const definePrompt = (t: JSONTypes) =>
  t.object({
    promptType: t.union(
      t.literal("User"),
      t.literal("System"),
      t.literal("Assistant"),
    ),
    prompt: t.string(),
    timestamp: t.string(),
  });

const definePlanStep = (t: JSONTypes) =>
  t.object({
    type: t.literal(TaskType.plan_step),
    actionType: t.nativeEnum(PlanningAgentActionType),
    title: t.string(),
    instructions: t.string(),
    filePath: t.string(),
    exitCriteria: t.string(),
    dependencies: t.string().optional(),
  });

export class EventsTable extends BaseTable {
  readonly table = "events";
  columns = this.setColumns((t) => ({
    id: t.identity().primaryKey(),
    projectId: t.integer().foreignKey("projects", "id"),
    userId: t.text(),
    repoFullName: t.text(0, Infinity).unique(),
    issueId: t.integer().nullable(),
    pullRequestId: t.integer().nullable(),
    type: t.enum("task_type", TASK_TYPE_VALUES),
    payload: t.json((t) =>
      t.discriminatedUnion("type", [
        t.object({
          type: t.literal(TaskType.task),
          id: t.string(),
          name: t.string().optional(),
          subType: t.nativeEnum(TaskSubType),
          description: t.string().optional(),
          storyPoints: t.number(),
          status: t.nativeEnum(TaskStatus),
          statusMessage: t.string().optional(),
        }),
        t.object({
          type: t.literal(TaskType.code),
          fileName: t.string(),
          filePath: t.string(),
          language: t.nativeEnum(Language).optional(),
          codeBlock: t.string(),
        }),
        t.object({
          type: t.literal(TaskType.design),
        }),
        t.object({
          type: t.literal(TaskType.terminal),
        }),
        t.object({
          type: t.literal(TaskType.plan),
          steps: t.array(definePlanStep(t)),
        }),
        definePlanStep(t),
        t.object({
          type: t.literal(TaskType.prompt),
          metadata: t.object({
            timestamp: t.string(),
            cost: t.number(),
            tokens: t.number(),
            duration: t.number(),
            model: t.string(),
          }),
          request: t.object({
            prompts: t.array(definePrompt(t)),
          }),
          response: t.object({
            prompt: definePrompt(t),
          }),
        }),
        t.object({
          type: t.literal(TaskType.issue),
          id: t.string(),
          issueId: t.number(),
          title: t.string(),
          description: t.string(),
          createdAt: t.string(),
          comments: t.array(defineComment(t)),
          author: t.string(),
          assignee: t.string(),
          status: t.union(t.literal("open"), t.literal("closed")),
          link: t.string(),
          stepsToAddressIssue: t.string().nullish(),
          issueQualityScore: t.number().nullish(),
          commitTitle: t.string().nullish(),
          filesToCreate: t.array(t.string()).nullish(),
          filesToUpdate: t.array(t.string()).nullish(),
        }),
        t.object({
          type: t.literal(TaskType.pull_request),
          pullRequestId: t.number(),
          title: t.string(),
          description: t.string().nullable(),
          link: t.string(),
          status: t.union(
            t.literal("open"),
            t.literal("closed"),
            t.literal("merged"),
          ),
          createdAt: t.string(),
          author: t.string(),
          branch: t.string(),
        }),
        t.object({
          type: t.literal(TaskType.command),
          command: t.string(),
          response: t.string(),
          directory: t.string(),
          exitCode: t.number().nullable(),
        }),
      ]),
    ),
    ...t.timestamps(),
  }));
}
