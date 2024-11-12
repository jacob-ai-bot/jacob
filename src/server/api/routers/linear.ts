import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { db } from "~/server/db/db";
import { TRPCError } from "@trpc/server";
import { fetchLinearTeams, syncLinearTeam } from "~/server/utils/linear";

export const linearRouter = createTRPCRouter({
  isUserConnectedToLinear: protectedProcedure.query(
    async ({
      ctx: {
        session: { user },
      },
    }) => {
      const databaseUser = await db.accounts.findBy({
        userId: parseInt(user.id),
      });
      return !!databaseUser?.linearAccessToken;
    },
  ),

  getTeams: protectedProcedure.query(
    async ({
      ctx: {
        session: { user },
      },
    }) => {
      const databaseUser = await db.accounts.findBy({
        userId: parseInt(user.id),
      });
      if (!databaseUser?.linearAccessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not connected to Linear",
        });
      }

      return fetchLinearTeams(databaseUser.id);
    },
  ),

  syncTeam: protectedProcedure
    .input(z.object({ projectId: z.number(), teamId: z.string() }))
    .mutation(
      async ({
        ctx: {
          session: { user, accessToken },
        },
        input,
      }) => {
        const databaseUser = await db.accounts.findBy({
          userId: parseInt(user.id),
        });
        if (!databaseUser?.linearAccessToken) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not connected to Linear",
          });
        }

        return syncLinearTeam(
          databaseUser.linearAccessToken,
          input.projectId,
          input.teamId,
          parseInt(user.id),
          accessToken,
        );
      },
    ),

  saveLinearProjectId: protectedProcedure
    .input(z.object({ linearTeamId: z.string(), projectId: z.number() }))
    .mutation(async ({ input }) => {
      await db.projects
        .where({ id: input.projectId })
        .update({ linearTeamId: input.linearTeamId });
      return { success: true };
    }),
});
