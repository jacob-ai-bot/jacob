import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db/db";

export const settingsRouter = createTRPCRouter({
  getAccountSettings: protectedProcedure.query(async ({ ctx }) => {
    const account = await db.accounts.findBy({ userId: ctx.session.user.id });
    if (!account) {
      throw new Error("Account not found");
    }
    return {
      localPath: account.localPath,
      email: ctx.session.user.email,
      doesCurrentBranchBuild: account.doesCurrentBranchBuild,
    };
  }),

  updateAccountSettings: protectedProcedure
    .input(
      z.object({
        localPath: z.string().optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const account = await db.accounts.findBy({ userId: ctx.session.user.id });
      if (!account) {
        throw new Error("Account not found");
      }

      const updateData: Partial<typeof account> = {};
      if (input.localPath !== undefined) {
        updateData.localPath = input.localPath;
      }
      if (input.email !== undefined) {
        // Update email in the user table
        await db.users.find(ctx.session.user.id).update({ email: input.email });
      }

      await db.accounts.find(account.id).update(updateData);
    }),
});

