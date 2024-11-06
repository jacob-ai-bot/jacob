import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db/db";
import {
  fetchJiraProjects,
  getJiraCloudIdResources,
  refreshJiraAccessToken,
  syncJiraBoard,
} from "~/server/utils/jira";

export const jiraRouter = createTRPCRouter({
  isUserConnectedToJira: protectedProcedure.query(
    async ({
      ctx: {
        session: { user },
      },
    }) => {
      const databaseUser = await db.accounts.findBy({
        userId: parseInt(user.id),
      });
      return !!databaseUser?.jiraAccessToken;
    },
  ),
  getBoards: protectedProcedure
    .input(
      z.object({
        jiraCloudId: z.string().optional(),
      }),
    )
    .query(
      async ({
        ctx: {
          session: { user },
        },
        input: { jiraCloudId },
      }) => {
        try {
          if (!jiraCloudId) {
            throw new Error("Jira cloud ID is required");
          }
          const account = await db.accounts.findBy({
            userId: parseInt(user.id),
          });

          if (!account?.jiraAccessToken || !jiraCloudId) {
            throw new Error("User not connected to Jira");
          }

          const newAccessToken = await refreshJiraAccessToken(account.id);
          return fetchJiraProjects(newAccessToken, jiraCloudId);
        } catch (error) {
          console.error("Error fetching Jira projects:", error);
          throw error;
        }
      },
    ),

  syncBoard: protectedProcedure
    .input(
      z.object({
        jiraCloudId: z.string(),
        projectId: z.number(),
        boardId: z.string().optional(),
      }),
    )
    .mutation(
      async ({
        ctx: {
          session: { user, accessToken: githubAccessToken },
        },
        input: { jiraCloudId, projectId, boardId },
      }) => {
        if (!boardId || !projectId || !jiraCloudId) {
          throw new Error("Board ID and project ID are required");
        }
        try {
          const account = await db.accounts.findBy({
            userId: parseInt(user.id),
          });

          if (!account?.jiraAccessToken || !jiraCloudId) {
            throw new Error("User not connected to Jira");
          }
          return syncJiraBoard(
            account.jiraAccessToken,
            jiraCloudId,
            projectId,
            boardId,
            account.userId,
            githubAccessToken,
          );
        } catch (error) {
          console.error("Error syncing Jira board:", error);
          throw error;
        }
      },
    ),
  getJiraCloudIdResources: protectedProcedure.query(
    async ({
      ctx: {
        session: { user },
      },
    }) => {
      const account = await db.accounts.findBy({
        userId: parseInt(user.id),
      });
      if (!account?.jiraAccessToken) {
        throw new Error("User not connected to Jira");
      }
      try {
        const newAccessToken = await refreshJiraAccessToken(account.id);
        return getJiraCloudIdResources(newAccessToken);
      } catch (error) {
        console.error("Error fetching Jira cloud ID resources:", error);
        throw error;
      }
    },
  ),
  saveJiraCloudId: protectedProcedure
    .input(
      z.object({
        jiraCloudId: z.string(),
        projectId: z.number(),
      }),
    )
    .mutation(
      async ({
        ctx: {
          session: { user },
        },
        input: { jiraCloudId, projectId },
      }) => {
        const account = await db.accounts.findBy({
          userId: parseInt(user.id),
        });
        if (!account?.jiraAccessToken) {
          throw new Error("User not connected to Jira");
        }
        await db.projects.find(projectId).update({
          jiraCloudId,
        });
        return { success: true };
      },
    ),
});
