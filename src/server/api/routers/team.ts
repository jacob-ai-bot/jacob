import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const teamRouter = router({
  getTeamMembers: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const members = await ctx.db.accounts.findMany({
      where: { teamAdminAccountId: userId },
      select: { id: true, login: true, jiraUsername: true },
    });
    return members;
  }),

  updateJiraUsername: protectedProcedure
    .input(
      z.object({
        memberId: z.number(),
        jiraUsername: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { memberId, jiraUsername } = input;
      // Verify that the requester is a team admin
      const adminAccount = await ctx.db.accounts.findBy({
        userId: ctx.session.user.id,
      });
      if (!adminAccount?.isTeamAdmin) {
        throw new Error("Not authorized");
      }
      // Update the team member's jiraUsername
      await ctx.db.accounts.update({
        where: { id: memberId },
        data: { jiraUsername },
      });
      return { success: true };
    }),
});
