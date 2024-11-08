import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db/db";
import { PlanningAgentActionType } from "~/server/db/enums";
import { type PlanStep } from "~/server/db/tables/planSteps.table";
import { getOrGeneratePlan } from "~/server/utils/plan";

const planStepInputSchema = z.object({
  projectId: z.number().int(),
  issueNumber: z.number().int(),
  type: z.nativeEnum(PlanningAgentActionType),
  title: z.string(),
  filePath: z.string(),
  instructions: z.string(),
  exitCriteria: z.string(),
  dependencies: z.string().nullable(),
});

export const planStepsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(planStepInputSchema)
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

  createPlanStep: protectedProcedure
    .input(planStepInputSchema)
    .mutation(async ({ input }) => {
      return await db.planSteps.create(input);
    }),

  regeneratePlan: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int(),
        issueNumber: z.number().int(),
        feedback: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { projectId, issueNumber, feedback } = input;

      // Remove existing plan steps
      await db.planSteps
        .where({ projectId, issueNumber, isActive: true })
        .update({ isActive: false });

      // Fetch necessary data for plan regeneration
      const project = await db.projects.findBy({ id: projectId });
      const issue = await db.issues.findBy({ projectId, issueNumber });

      if (!project || !issue) {
        throw new Error("Project or issue not found");
      }

      // Regenerate the plan
      const newPlan = await getOrGeneratePlan({
        projectId,
        issueId: issue.id,
        githubIssue: issue.body,
        rootPath: project.rootPath,
        feedback,
      });

      // Save the new plan steps
      for (const step of newPlan.steps) {
        await db.planSteps.create({
          ...step,
          projectId,
          issueNumber,
        });
      }

      return newPlan;
    }),
});
