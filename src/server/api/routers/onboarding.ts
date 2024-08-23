// src/server/api/routers/onboarding.ts

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { cloneRepo } from "~/server/git/clone";
import { generateRepoSettings } from "~/server/utils/settings";

// TODO: ADD THIS TO THE PAGE FOR /SETUP NEED TO ADD A LOADING SCREEN THAT EXPLAINS MORE ABOUT JACoB AND WHAT'S HAPPENING. ALSO CALL THE CODEBASE CONTEXT GENERATOR. ONCE THE SETTINGS ARE GENERATED, PASS THEM TO THE PAGE AND LOAD THEM AS DEFAULTS FOR THE FORM (IT NEEDS A LOT MORE FIELDS BUT YOU CAN GROUP/HIDE THEM). THEN NAVIGATE TO A PAGE THAT FIRST CHECKS TO SEE IF IT'S A NODE PROJECT, THEN CHECKS TO SEE IF IT BUILDS. IF IT DOESN'T BUILD, THEN TAKE THE ERROR MESSAGES AND TRY TO USE IT AS A FIRST SAMPLE PROJECT. NAVIGATE TO THE NEW DASHBOARD THAT HAS THE CONTEXT VISUALIZER (SHOW THIS FIRST THEN THE LIVE CHAT THEN THE "TODOS" WITH THE MORE DETAILED ISSUES AND THEN THE "SHOW WHAT JACOB IS DOING" SECTION.
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
          return { settings };
        } finally {
          if (cleanupClone) {
            await cleanupClone();
          }
        }
      },
    ),
});
