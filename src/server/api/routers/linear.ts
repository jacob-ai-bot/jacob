import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db/db";
import {
  refreshLinearAccessToken,
  fetchLinearBoards,
  syncLinearBoard,
} from "~/server/utils/linear";

export const linearRouter = createTRPCRouter({
  isUserConnectedToLinear: protectedProcedure.query(async ({ ctx }) => {
    const account = await db.accounts.findOne({
      userId: ctx.session.user.id,
      linearAccessToken: { not: null },
    });
    return !!account;
  }),

  getBoards: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const account = await db.accounts.findOne({
        userId: ctx.session.user.id,
      });

      if (!account?.linearAccessToken) {
        throw new Error("User not connected to Linear");
      }

      const accessToken = await refreshLinearAccessToken(account);
      return fetchLinearBoards(accessToken);
    }),

  saveLinearBoardId: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        boardId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await db.projects.update(
        { id: input.projectId },
        { linearBoardId: input.boardId },
      );
      return true;
    }),

  syncBoard: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        boardId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const account = await db.accounts.findOne({
        userId: ctx.session.user.id,
      });

      if (!account?.linearAccessToken) {
        throw new Error("User not connected to Linear");
      }

      const accessToken = await refreshLinearAccessToken(account);
      await syncLinearBoard(accessToken, input.projectId, input.boardId);
      return true;
    }),
});
