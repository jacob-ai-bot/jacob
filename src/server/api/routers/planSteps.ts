import { Octokit } from "@octokit/rest";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db/db";
import { PlanningAgentActionType } from "~/server/db/enums";
import { type PlanStep } from "~/server/db/tables/planSteps.table";
import { cloneRepo } from "~/server/git/clone";
import { getOrGeneratePlan } from "~/server/utils/plan";

export const planStepsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int(),
        issueNumber: z.number().int(),
        type: z.nativeEnum(PlanningAgentActionType),
        title: z.string(),
        filePath: z.string(),
        instructions: z.string(),
        exitCriteria: z.string().nullable(),
        dependencies: z.string().nullable(),
      }),
    )
    .mutation(async ({ input }) => await db.planSteps.create(input)),

  getByProjectAndIssue: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int(),
        issueNumber: z.number().int(),
      }),
    )
    .query(
      async ({ input: { projectId, issueNumber } }): Promise<PlanStep[]> =>
        await db.planSteps
          .where({
            projectId,
            issueNumber,
            isActive: true,
          })
          .all()
          .order("createdAt"),
    ),

  getById: protectedProcedure.input(z.number().int()).query(
    async ({ input: id }): Promise<PlanStep | undefined> =>
      await db.planSteps.findByOptional({
        id,
      }),
  ),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        type: z.nativeEnum(PlanningAgentActionType).optional(),
        title: z.string().optional(),
        filePath: z.string().optional(),
        instructions: z.string().optional(),
        exitCriteria: z.string().nullable().optional(),
        dependencies: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await db.planSteps.find(id).update(data);
    }),

  delete: protectedProcedure
    .input(z.number().int())
    .mutation(({ input }) =>
      db.planSteps.find(input).update({ isActive: false }),
    ),

  redoPlan: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int(),
        issueNumber: z.number().int(),
        feedback: z.string(),
      }),
    )
    .mutation(
      async ({
        input: { projectId, issueNumber, feedback },
        ctx: {
          session: { accessToken },
        },
      }) => {
        // Deactivate existing plan steps
        await db.planSteps
          .where({ projectId, issueNumber, isActive: true })
          .update({ isActive: false });

        // get the project
        const project = await db.projects.find(projectId);
        if (!project) {
          throw new Error("Project not found");
        }

        let cleanupClone: (() => Promise<void>) | undefined;
        try {
          // get the Issue from GitHub
          console.log("Getting issue", issueNumber);
          const octokit = new Octokit({ auth: accessToken });
          const repoFullName = project.repoFullName;
          const [org, repo] = repoFullName.split("/");
          if (!org || !repo) {
            throw new Error("Invalid repo");
          }

          const { data: issue } = await octokit.issues.get({
            owner: org,
            repo,
            issue_number: issueNumber,
          });

          const githubIssue = `${issue.title}\n\n${issue.body}`;

          const { path: rootPath, cleanup } = await cloneRepo({
            repoName: project.repoFullName,
            token: accessToken,
          });
          cleanupClone = cleanup;
          // Run the plan again
          const newPlanSteps = await getOrGeneratePlan({
            projectId,
            issueId: issueNumber,
            githubIssue,
            rootPath,
            feedback,
          });

          return newPlanSteps;
        } catch (error) {
          console.error(error);
        } finally {
          await cleanupClone?.();
        }
      },
    ),
});
