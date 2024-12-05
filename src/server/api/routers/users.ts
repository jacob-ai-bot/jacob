import { z } from "zod";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db/db";

export const usersRouter = createTRPCRouter({
  setDashboardEnabled: adminProcedure
    .input(z.object({ id: z.number(), enabled: z.boolean() }))
    .mutation(async ({ input: { id, enabled } }) => {
      return db.users.find(id).update({
        dashboardEnabled: enabled,
      });
    }),

  getTeamMembers: protectedProcedure.query(async ({ ctx: { session } }) => {
    if (!session.user.isTeamAdmin) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const account = await db.accounts.findByOptional({
      userId: parseInt(session.user.id),
    });
    if (!account) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    const teamMembers = await db.accounts
      .where({ teamAdminAccountId: account.id })
      .selectAll();
    // loop through teamMembers and look up the user for each
    const teamMembersWithUser = await Promise.all(
      teamMembers.map(async (member) => {
        const user = await db.users.find(member.userId);
        return { ...member, user };
      }),
    );
    // only return the email and jiraUsername
    return teamMembersWithUser.map((member) => ({
      id: member.id,
      name: member.user.name ?? member.user.login ?? member.user.email ?? "N/A",
      jiraUsername: member.jiraUsername,
      linearUsername: member.linearUsername,
    }));
  }),

  updateTeamMemberJiraUsername: protectedProcedure
    .input(
      z.object({
        accountId: z.number(),
        jiraUsername: z.string().nullable(),
      }),
    )
    .mutation(async ({ input, ctx: { session } }) => {
      if (!session.user.isTeamAdmin) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { accountId, jiraUsername } = input;
      const adminAccount = await db.accounts.findBy({
        userId: parseInt(session.user.id),
      });
      const teamMember = await db.accounts.findByOptional({
        id: accountId,
        teamAdminAccountId: adminAccount.id,
      });
      if (!teamMember) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return db.accounts.find(accountId).update({ jiraUsername });
    }),

  updateTeamMemberLinearUsername: protectedProcedure
    .input(
      z.object({
        accountId: z.number(),
        linearUsername: z.string().nullable(),
      }),
    )
    .mutation(async ({ input, ctx: { session } }) => {
      if (!session.user.isTeamAdmin) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { accountId, linearUsername } = input;
      const adminAccount = await db.accounts.findBy({
        userId: parseInt(session.user.id),
      });
      const teamMember = await db.accounts.findByOptional({
        id: accountId,
        teamAdminAccountId: adminAccount.id,
      });
      if (!teamMember) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return db.accounts.find(accountId).update({ linearUsername });
    }),
});
