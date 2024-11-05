import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db/db";
import {
  fetchJiraProjects,
  getJiraCloudIdResources,
  syncJiraBoard,
} from "~/server/utils/jira";

export const jiraRouter = createTRPCRouter({
  isUserConnectedToJira: protectedProcedure.query(
    async ({
      ctx: {
        session: { user },
      },
    }) => {
      const databaseUser = await db.users.findBy({
        id: parseInt(user.id),
      });
      return !!databaseUser?.jiraToken;
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
          const databaseUser = await db.users.findBy({ id: parseInt(user.id) });

          if (!databaseUser?.jiraToken || !jiraCloudId) {
            throw new Error("User not connected to Jira");
          }
          return fetchJiraProjects(databaseUser.jiraToken, jiraCloudId);
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
          session: { user },
        },
        input: { jiraCloudId, projectId, boardId },
      }) => {
        if (!boardId || !projectId || !jiraCloudId) {
          throw new Error("Board ID and project ID are required");
        }
        try {
          const databaseUser = await db.users.findBy({
            id: parseInt(user.id),
          });

          if (!databaseUser?.jiraToken || !jiraCloudId) {
            throw new Error("User not connected to Jira");
          }
          return syncJiraBoard(
            databaseUser.jiraToken,
            jiraCloudId,
            projectId,
            boardId,
            databaseUser.id,
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
      const databaseUser = await db.users.findBy({
        id: parseInt(user.id),
      });
      if (!databaseUser?.jiraToken) {
        throw new Error("User not connected to Jira");
      }
      return getJiraCloudIdResources(databaseUser.jiraToken);
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
        const databaseUser = await db.users.findBy({
          id: parseInt(user.id),
        });
        if (!databaseUser?.jiraToken) {
          throw new Error("User not connected to Jira");
        }
        await db.projects.find(projectId).update({
          jiraCloudId,
        });
        return { success: true };
      },
    ),
});
