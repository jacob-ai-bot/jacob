import { type JSONTypes } from "orchid-core";
import type { Selectable, Insertable, Updateable, Queryable } from "orchid-orm";
import { BaseTable } from "../baseTable";
import { TaskType } from "../enums";
import { Language } from "~/server/utils/settings";

export type Event = Selectable<EventsTable>;
export type NewEvent = Insertable<EventsTable>;
export type EventUpdate = Updateable<EventsTable>;
export type EventQueryable = Queryable<EventsTable>;

const TASK_TYPE_VALUES = Object.values(TaskType) as [TaskType, ...TaskType[]];

export enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  DONE = "done",
}

export enum TaskSubType {
  CREATE_NEW_FILE = "Create New File",
  EDIT_FILES = "Edit Files",
  CODE_REVIEW = "Code Review",
}

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

export class EventsTable extends BaseTable {
  readonly table = "events";
  columns = this.setColumns((t) => ({
    id: t.identity().primaryKey(),
    projectId: t.integer().foreignKey("projects", "id"),
    userId: t.text(),
    repoFullName: t.text(0, Infinity).unique(),
    issueId: t.integer().nullable(),
    type: t.enum("task_type", TASK_TYPE_VALUES),
    payload: t.json((t) =>
      t.discriminatedUnion("type", [
        t.object({
          type: t.literal(TaskType.task),
          id: t.string(),
          name: t.string(),
          subType: t.nativeEnum(TaskSubType),
          description: t.string(),
          storyPoints: t.number(),
          status: t.nativeEnum(TaskStatus),
        }),
        t.object({
          type: t.literal(TaskType.code),
          fileName: t.string(),
          filePath: t.string(),
          language: t.nativeEnum(Language),
          codeBlock: t.string(),
          content: t.string(),
        }),
        t.object({
          type: t.literal(TaskType.design),
        }),
        t.object({
          type: t.literal(TaskType.terminal),
        }),
        t.object({
          type: t.literal(TaskType.plan),
          id: t.string().optional(),
          title: t.string(),
          description: t.string(),
          position: t.number(),
          isComplete: t.boolean(),
        }),
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
          id: t.string(),
          pullRequestId: t.number(),
          title: t.string(),
          description: t.string(),
          link: t.string(),
          status: t.union(
            t.literal("open"),
            t.literal("closed"),
            t.literal("merged"),
          ),
          createdAt: t.string(),
          author: t.string(),
          comments: t.array(defineComment(t)),
          changedFiles: t.number(),
          additions: t.number(),
          deletions: t.number(),
        }),
        t.object({
          type: t.literal(TaskType.command),
          command: t.string().optional(),
          response: t.string().optional(),
          directory: t.string().optional(),
        }),
      ]),
    ),
    ...t.timestamps(),
  }));
}
