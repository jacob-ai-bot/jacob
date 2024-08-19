// src/server/api/routers/codebaseContext.ts

import { z } from "zod";
import { db } from "~/server/db/db";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type ContextItem } from "~/server/utils/codebaseContext";

export const codebaseContextRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
      }),
    )
    .query(async ({ input: { projectId } }): Promise<ContextItem[]> => {
      const codebaseContext = await db.codebaseContext
        .where({ projectId })
        .order({ filePath: "ASC" })
        .all();
      return (
        codebaseContext?.map((context) => context.context as ContextItem) ?? []
      );
    }),

  getByFilePath: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        filePath: z.string(),
      }),
    )
    .query(
      async ({
        input: { projectId, filePath },
      }): Promise<ContextItem | null> => {
        const existingContext =
          (await db.codebaseContext.findByOptional({
            projectId,
            filePath,
          })) ?? null;

        return (existingContext?.context as ContextItem) ?? null;
      },
    ),
});
