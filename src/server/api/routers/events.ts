import { z } from "zod";
import { Octokit } from "@octokit/rest";
import { TRPCError } from "@trpc/server";

import { db } from "~/server/db/db";
import { TaskType } from "~/server/db/enums";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { cloneRepo } from "~/server/git/clone";
import { getSourceMap } from "~/server/analyze/sourceMap";
import { traverseCodebase } from "~/server/analyze/traverse";
import { parseTemplate, getRepoSettings } from "~/server/utils";
import { getIssue } from "~/server/github/issue";
import {
  ExtractedIssueInfoSchema,
  type ExtractedIssueInfo,
} from "~/server/code/extractedIssue";
import { sendGptRequestWithSchema } from "~/server/openai/request";
import { use } from "react";

export const eventsRouter = createTRPCRouter({
  getTasks: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        org: z.string(),
        repo: z.string(),
      }),
    )
    .query(
      async ({
        ctx: {
          session: { accessToken },
        },
      }) => {
        // match on userId
        // match on repo
        // Check to ensure that the user has access to the repo
        const tasks = await db.events
          .where({ type: TaskType.task })
          .where({ userId: userId });

        return tasks;
      },
    ),
});
