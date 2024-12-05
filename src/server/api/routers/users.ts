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

  getTeamMembers: protectedProcedure.query(async ({ ctx }) => {
    const { session } = ctx;
    if (!session.user.isTeamAdmin) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const teamAdminAccountId = session.user.id;
    return db.accounts.where({ teamAdminAccountId }).selectAll();
  }),

  updateTeamMemberJiraUsername: protectedProcedure
    .input(
      z.object({
        accountId: z.number(),
        jiraUsername: z.string().nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { session } = ctx;
      if (!session.user.isTeamAdmin) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { accountId, jiraUsername } = input;
      const teamMember = await db.accounts.findBy({
        id: accountId,
        teamAdminAccountId: session.user.id,
      });
      if (!teamMember) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return db.accounts.find(accountId).update({ jiraUsername });
    }),
});
