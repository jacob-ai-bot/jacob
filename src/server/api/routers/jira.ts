import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db/db";
import { fetchJiraBoards, syncJiraBoard } from "~/server/utils/jira";

export const jiraRouter = createTRPCRouter({
  getBoards: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.users.findBy({ id: ctx.session.user.id });
    if (!user.jiraToken || !user.jiraCloudId) {
      throw new Error("User not connected to Jira");
    }
    return fetchJiraBoards(user.jiraToken, user.jiraCloudId);
  }),

  syncBoard: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        boardId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await db.users.findBy({ id: ctx.session.user.id });
      if (!user.jiraToken || !user.jiraCloudId) {
        throw new Error("User not connected to Jira");
      }
      return syncJiraBoard(
        user.jiraToken,
        user.jiraCloudId,
        input.projectId,
        input.boardId,
      );
    }),
});
