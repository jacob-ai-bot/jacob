import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { db } from "~/server/db/db";
import { TRPCError } from "@trpc/server";
import {
  fetchLinearProjects,
  fetchLinearBoards,
  syncLinearBoard,
  refreshLinearAccessToken,
} from "~/server/utils/linear";

export const linearRouter = createTRPCRouter({
  isUserConnectedToLinear: protectedProcedure.query(async ({ ctx }) => {
    const account = await db.accounts.findBy({ userId: ctx.session.user.id });
    return !!account?.linearAccessToken;
  }),

  getProjects: protectedProcedure.query(async ({ ctx }) => {
    const account = await db.accounts.findBy({ userId: ctx.session.user.id });
    if (!account?.linearAccessToken) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not connected to Linear",
      });
    }

    let accessToken = account.linearAccessToken;
    if (account.expires_at && Date.now() > account.expires_at) {
      accessToken = await refreshLinearAccessToken(ctx.session.user.id);
    }

    return fetchLinearProjects(accessToken);
  }),

  getBoards: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const account = await db.accounts.findBy({ userId: ctx.session.user.id });
      if (!account?.linearAccessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not connected to Linear",
        });
      }

      let accessToken = account.linearAccessToken;
      if (account.expires_at && Date.now() > account.expires_at) {
        accessToken = await refreshLinearAccessToken(ctx.session.user.id);
      }

      return fetchLinearBoards(accessToken, input.projectId);
    }),

  syncBoard: protectedProcedure
    .input(z.object({ projectId: z.number(), boardId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const account = await db.accounts.findBy({ userId: ctx.session.user.id });
      if (!account?.linearAccessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not connected to Linear",
        });
      }

      let accessToken = account.linearAccessToken;
      if (account.expires_at && Date.now() > account.expires_at) {
        accessToken = await refreshLinearAccessToken(ctx.session.user.id);
      }

      return syncLinearBoard(accessToken, input.projectId, input.boardId);
    }),

  saveLinearProjectId: protectedProcedure
    .input(z.object({ linearProjectId: z.string(), projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.projects
        .where({ id: input.projectId })
        .update({ linearProjectId: input.linearProjectId });
      return { success: true };
    }),
});
