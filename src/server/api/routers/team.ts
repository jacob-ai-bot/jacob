import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { db } from "~/server/db/db";

export const teamRouter = createTRPCRouter({
  getTeamMembers: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx.session;
    const account = await db.accounts.findBy({ userId: parseInt(user.id, 10) });

    if (!account.isTeamAdmin) {
      throw new Error("User is not a team admin");
    }

    const teamMembers = await db.accounts
      .findMany({
        where: { teamAdminAccountId: account.id },
      })
      .select("id", "userId", "jiraUsername");

    const userIds = teamMembers.map((member) => member.userId);
    const users = await db.users
      .findMany({
        where: { id: { in: userIds } },
      })
      .select("id", "name", "email");

    return teamMembers.map((member) => {
      const user = users.find((u) => u.id === member.userId);
      return {
        id: member.id,
        name: user?.name ?? "",
        email: user?.email ?? "",
        jiraUsername: member.jiraUsername,
      };
    });
  }),

  updateTeamMemberJiraUsername: protectedProcedure
    .input(
      z.object({
        accountId: z.number(),
        jiraUsername: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const adminAccount = await db.accounts.findBy({
        userId: parseInt(user.id, 10),
      });

      if (!adminAccount.isTeamAdmin) {
        throw new Error("User is not a team admin");
      }

      const teamMember = await db.accounts.findBy({ id: input.accountId });
      if (teamMember.teamAdminAccountId !== adminAccount.id) {
        throw new Error("User is not a member of your team");
      }

      await db.accounts
        .find(input.accountId)
        .update({ jiraUsername: input.jiraUsername });

      return { success: true };
    }),
});
