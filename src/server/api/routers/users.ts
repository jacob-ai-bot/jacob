import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { db } from "~/server/db/db";

export const usersRouter = createTRPCRouter({
  setDashboardEnabled: adminProcedure
    .input(z.object({ id: z.number(), enabled: z.boolean() }))
    .mutation(async ({ input: { id, enabled } }) => {
      return db.users.find(id).update({
        dashboardEnabled: enabled,
      });
    }),
});
