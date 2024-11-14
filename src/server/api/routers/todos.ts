import { z } from "zod";
import { db } from "~/server/db/db";
import { TodoStatus } from "~/server/db/enums";
import { researchIssue } from "~/server/agent/research";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type Todo } from "./events";
import { cloneRepo } from "~/server/git/clone";

export const todoRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        developerId: z.string().optional(), // deprecated
      }),
    )
    .query(async ({ input: { projectId } }): Promise<Todo[]> => {
      return await db.todos
        .where({ projectId, isArchived: false })
        .order({ position: "DESC" })
        .all();
    }),
  getById: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .query(async ({ input: { id } }): Promise<Todo> => {
      const todo = await db.todos.find(id);
      return todo;
    }),

  getByIssueId: protectedProcedure
    .input(
      z.object({
        issueId: z.number(),
      }),
    )
    .query(async ({ input: { issueId } }): Promise<Todo | null> => {
      const todo = await db.todos.where({ issueId }).first();
      return todo ?? null;
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        description: z.string(),
        name: z.string(),
        status: z.nativeEnum(TodoStatus),
        issueId: z.number().nullable(),
        branch: z.string().nullable(),
      }),
    )
    .mutation(async ({ input }): Promise<Todo> => {
      const { issueId } = input;

      if (!issueId) {
        throw new Error("Issue ID is required");
      }

      return await db.todos.selectAll().insert(input);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        description: z.string().optional(),
        name: z.string().optional(),
        status: z.nativeEnum(TodoStatus).optional(),
        issueId: z.number().optional(),
        branch: z.string().optional(),
        isArchived: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input: { id, ...updates } }): Promise<Todo> => {
      const updatedTodo = await db.todos.selectAll().find(id).update(updates);
      return updatedTodo;
    }),

  archive: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ input: { id } }): Promise<Todo> => {
      const archivedTodo = await db.todos
        .selectAll()
        .find(id)
        .update({ isArchived: true });
      return archivedTodo;
    }),

  updatePosition: protectedProcedure
    .input(z.array(z.number()))
    .mutation(async ({ input: ids }): Promise<void> => {
      await db.$transaction(async () => {
        // Update the position of each todo
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          if (!id) continue;
          await db.todos.find(id).update({ position: i + 1 });
        }
      });
    }),

  delete: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ input: { id } }): Promise<{ id: number }> => {
      await db.todos.find(id).delete();
      return { id };
    }),

  researchIssue: protectedProcedure
    .input(
      z.object({
        issueId: z.number(),
        todoId: z.number(),
        githubIssue: z.string(),
        repo: z.string(),
        org: z.string(),
      }),
    )
    .mutation(
      async ({
        input: { issueId, todoId, githubIssue, repo, org },
        ctx: {
          session: { accessToken },
        },
      }): Promise<void> => {
        if (issueId) {
          const [existingResearch] = await db.research
            .selectAll()
            .where({ todoId })
            .where({ issueId });
          if (!existingResearch) {
            const createdTodo = await db.todos.findOptional(todoId);
            if (createdTodo) {
              let cleanupClone: (() => Promise<void>) | undefined;
              try {
                const { path: rootPath, cleanup } = await cloneRepo({
                  repoName: `${org}/${repo}`,
                  token: accessToken,
                });
                cleanupClone = cleanup;
                await researchIssue({
                  githubIssue,
                  todoId,
                  issueId,
                  rootDir: rootPath,
                  projectId: createdTodo.projectId,
                });
              } catch (error) {
                console.error(error);
              } finally {
                await cleanupClone?.();
              }
            }
          }
        }
      },
    ),

  submitUserAnswers: protectedProcedure
    .input(
      z.object({
        todoId: z.number(),
        issueId: z.number(),
        answers: z.record(z.string(), z.string()),
      }),
    )
    .mutation(
      async ({ input: { todoId, issueId, answers } }): Promise<void> => {
        for (const [questionId, answer] of Object.entries(answers)) {
          await db.research
            .where({ id: parseInt(questionId), todoId, issueId })
            .update({ answer });
        }
      },
    ),
});
