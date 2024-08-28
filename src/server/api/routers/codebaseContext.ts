import { z } from "zod";
import { db } from "~/server/db/db";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type ContextItem } from "~/server/utils/codebaseContext";
import { Octokit } from "@octokit/rest";
import { TRPCError } from "@trpc/server";
import {
  createWebEvent,
  publishWebEventToQueue,
} from "~/server/messaging/queue";

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
  // TODO: CALL THIS FROM THE FRONT END, ALSO CREATE THE PROMPT THAT AUTO-CREATES THE CONFIG AND PASSES IT TO THE SETUP SCREEN. CALL THESE IN PAGE.TSX. ALSO TRY TO RUN THE BUILD OR AT LEAST TRY TO CHECK TO SEE IF THE USER HAS ISSUES ENABLED IN THE REPO OR NOT.
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
      }): Promise<void> => {
        const octokit = new Octokit({ auth: accessToken });

        if (!org || !repoName) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid request",
          });
        }

        // Call Octokit to get the repository
        const { data: repository } = await octokit.rest.repos.get({
          owner: org,
          repo: repoName,
        });
        const repoFullName = repository.full_name;

        const webEvent = createWebEvent({
          repoId: repository.id,
          repoFullName,
          action: "generate_context",
          token: accessToken,
          params: {
            repository,
          },
        });

        await publishWebEventToQueue(webEvent);
      },
    ),
});
