import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { env } from "~/env";
import { db } from "~/server/db/db";

export const jiraRouter = createTRPCRouter({
  oauthCallback: protectedProcedure
    .input(
      z.object({
        code: z.string(),
        state: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { code } = input;
      const response = await fetch('https://auth.atlassian.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: env.JIRA_CLIENT_ID,
          client_secret: env.JIRA_CLIENT_SECRET,
          code,
          redirect_uri: 'https://app.jacb.ai/api/jira/callback',
        }),
      });

      const data = await response.json();
      const { access_token } = data;

      await db.users
        .update({
          jiraToken: access_token,
        })
        .where('id', '=', ctx.session.user.id)
        .execute();

      return { success: true };
    }),
});
