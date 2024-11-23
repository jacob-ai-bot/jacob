import { z } from "zod";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { db } from "~/server/db/db";

export const projectsRouter = createTRPCRouter({
  getByOrgAndRepo: protectedProcedure
    .input(z.object({ org: z.string(), repo: z.string() }))
    .query(async ({ input }) => {
      try {
        return db.projects.findBy({
          repoFullName: `${input.org}/${input.repo}`,
        });
      } catch (error: any) {
        console.error(`Error getting project by org and repo: ${error}`);
        return null;
      }
    }),
  setAgentEnabled: adminProcedure
    .input(z.object({ id: z.number(), enabled: z.boolean() }))
    .mutation(async ({ input: { id, enabled } }) => {
      return db.projects.find(id).update({
        agentEnabled: enabled,
      });
    }),
});
