// src/server/api/routers/codebaseContext.ts

import { z } from "zod";
import { db } from "~/server/db/db";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type ContextItem } from "~/server/utils/codebaseContext";
import { getOrCreateCodebaseContext } from "~/server/utils/codebaseContext";
import { cloneRepo } from "~/server/git/clone";
import { traverseCodebase } from "~/server/analyze/traverse";
import { Octokit } from "@octokit/rest";
import { TRPCError } from "@trpc/server";
import { addProjectToDB } from "~/server/messaging/queue";

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

  generateCodebaseContext: protectedProcedure
    .input(
      z.object({
        org: z.string(),
        repoName: z.string(),
      }),
    )
    .mutation(
      async ({
        input: { org, repoName },
        ctx: {
          session: { accessToken },
        },
      }): Promise<ContextItem[]> => {
        const octokit = new Octokit({ auth: accessToken });

        if (!org || !repoName) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid request",
          });
        }

        // Call Octokit to get the repository
        const { data: respository } = await octokit.rest.repos.get({
          owner: org,
          repo: repoName,
        });
        const repoFullName = respository.full_name;

        // Try to fetch the project from the database
        let project = await db.projects.findByOptional({ repoFullName });

        // If the project doesn't exist, create it
        if (!project) {
          project = await addProjectToDB(respository, "", "");
        }

        // Clone the repository
        const { path: rootPath, cleanup } = await cloneRepo({
          repoName: repoFullName,
          token: accessToken,
        });

        try {
          // Generate or retrieve the codebase context
          const allFiles = traverseCodebase(rootPath);
          const contextItems = await getOrCreateCodebaseContext(
            project.id,
            rootPath,
            allFiles ?? [],
          );
          return contextItems;
        } finally {
          // Ensure cleanup is called after processing
          await cleanup();
        }
      },
    ),
});
