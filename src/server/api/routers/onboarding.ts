// src/server/api/routers/onboarding.ts

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db/db";
import { cloneRepo } from "~/server/git/clone";
import { generateRepoSettings } from "~/server/utils/settings";

// TODO: NAVIGATE TO A PAGE THAT FIRST CHECKS TO SEE IF IT'S A NODE PROJECT, THEN CHECKS TO SEE IF IT BUILDS. IF IT DOESN'T BUILD, THEN TAKE THE ERROR MESSAGES AND TRY TO USE IT AS A FIRST SAMPLE PROJECT. NAVIGATE TO THE NEW DASHBOARD THAT HAS THE CONTEXT VISUALIZER (SHOW THIS FIRST THEN THE LIVE CHAT THEN THE "TODOS" WITH THE MORE DETAILED ISSUES AND THEN THE "SHOW WHAT JACOB IS DOING" SECTION.
export const onboardingRouter = createTRPCRouter({
  analyzeProjectForSettings: protectedProcedure
    .input(
      z.object({
        org: z.string(),
        repoName: z.string(),
      }),
    )
    .query(
      async ({
        input: { org, repoName },
        ctx: {
          session: { accessToken },
        },
      }) => {
        const repoFullName = `${org}/${repoName}`;
        let cleanupClone: (() => Promise<void>) | undefined;

        try {
          const { path, cleanup } = await cloneRepo({
            repoName: repoFullName,
            token: accessToken,
          });
          cleanupClone = cleanup;

          const settings = await generateRepoSettings(path);
          return settings;
        } finally {
          if (cleanupClone) {
            await cleanupClone();
          }
        }
      },
    ),
  saveSettings: protectedProcedure
    .input(z.object({ settings: z.any(), org: z.string(), repo: z.string() }))
    .mutation(async ({ input: { settings, org, repo } }) => {
      // Fetch the project from the database
      const project = await db.projects.findBy({
        repoFullName: `${org}/${repo}`,
      });

      if (!project) {
        throw new Error("Project not found");
      }

      // Update the project with the new settings
      await db.projects.find(project.id).update({ settings });
    }),
});
