import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db/db";
import { PlanningAgentActionType } from "~/server/db/enums";
import { type PlanStep } from "~/server/db/tables/planSteps.table";
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
        exitCriteria: z.string(),
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

  regeneratePlan: protectedProcedure
    .input(
      z.object({
        org: z.string(),
        repo: z.string(),
        feedback: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { org, repo, feedback } = input;
      const project = await db.projects.findByOptional({ org, repo });
      if (!project) {
        throw new Error("Project not found");
      }
      const issue = await db.issues.findByOptional({ projectId: project.id });
      if (!issue) {
        throw new Error("Issue not found");
      }
      await db.planSteps
        .where({ projectId: project.id, issueNumber: issue.number })
        .delete();
      const newPlan = await getOrGeneratePlan({
        projectId: project.id,
        issueId: issue.id,
        githubIssue: issue.body,
        rootPath: project.rootPath,
        contextItems: undefined,
        feedback,
      });
      return newPlan;
    }),
});
