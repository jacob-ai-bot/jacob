import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const teamRouter = createTRPCRouter({
  getTeamMembers: protectedProcedure.query(async ({ ctx }) => {
    const { session } = ctx;
    if (!session.user.isTeamAdmin) {
      throw new Error("Not authorized");
    }

    const teamMembers = await ctx.db.accounts.findMany({
      where: {
        teamAdminAccountId: parseInt(session.user.id, 10),
      },
      select: {
        id: true,
        jiraUsername: true,
        userId: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return teamMembers.map((member) => ({
      id: member.id,
      name: member.user.name,
      email: member.user.email,
      jiraUsername: member.jiraUsername,
    }));
  }),

  updateJiraUsername: protectedProcedure
    .input(
      z.object({
        accountId: z.number(),
        username: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { session } = ctx;
      if (!session.user.isTeamAdmin) {
        throw new Error("Not authorized");
      }

      const teamMember = await ctx.db.accounts.findBy({
        id: input.accountId,
        teamAdminAccountId: parseInt(session.user.id, 10),
      });

      if (!teamMember) {
        throw new Error("Team member not found");
      }

      await ctx.db.accounts.find(input.accountId).update({
        jiraUsername: input.username,
      });

      return { success: true };
    }),
});
