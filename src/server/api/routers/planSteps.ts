import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db/db";
import { PlanningAgentActionType } from "~/server/db/enums";
import { type PlanStep } from "~/server/db/tables/planSteps.table";

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

  redoPlan: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int(),
        issueNumber: z.number().int(),
        feedback: z.string(),
      }),
    )
    .mutation(async ({ input: { projectId, issueNumber, feedback } }) => {
      // Deactivate existing plan steps
      await db.planSteps
        .where({ projectId, issueNumber, isActive: true })
        .update({ isActive: false });

      // TODO: Implement logic to generate new plan steps based on feedback
      // This is a placeholder implementation
      const newPlanSteps = [
        {
          projectId,
          issueNumber,
          type: PlanningAgentActionType.EditExistingCode,
          title: "New Step 1",
          filePath: "/path/to/file1",
          instructions: "Instructions for new step 1",
          exitCriteria: "Exit criteria for new step 1",
          dependencies: null,
        },
        {
          projectId,
          issueNumber,
          type: PlanningAgentActionType.CreateNewCode,
          title: "New Step 2",
          filePath: "/path/to/file2",
          instructions: "Instructions for new step 2",
          exitCriteria: "Exit criteria for new step 2",
          dependencies: null,
        },
      ];

      // Create new plan steps
      for (const step of newPlanSteps) {
        await db.planSteps.create(step);
      }

      return newPlanSteps;
    }),
});
