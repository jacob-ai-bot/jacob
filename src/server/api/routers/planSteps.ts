import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db/db";

export const planStepsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int(),
        issueNumber: z.number().int(),
        stepNumber: z.number().int(),
        filePath: z.string().nullable(),
        instructions: z.string(),
        exitCriteria: z.string().nullable(),
      }),
    )
    .mutation(({ input }) => db.planSteps.create(input)),

  getByProjectAndIssue: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int(),
        issueNumber: z.number().int(),
      }),
    )
    .query(({ input }) =>
      db.planSteps
        .selectAll()
        .where({
          projectId: input.projectId,
          issueNumber: input.issueNumber,
          isActive: true,
        })
        .order("stepNumber"),
    ),

  getById: protectedProcedure
    .input(z.number().int())
    .query(({ input }) =>
      db.planSteps.findByOptional({ id: input, isActive: true }),
    ),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        filePath: z.string().nullable().optional(),
        instructions: z.string().optional(),
        exitCriteria: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return db.planSteps.find(id).update(data);
    }),

  delete: protectedProcedure
    .input(z.number().int())
    .mutation(({ input }) =>
      db.planSteps.find(input).update({ isActive: false }),
    ),

  reorder: protectedProcedure
    .input(z.array(z.number().int()))
    .mutation(async ({ input }) => {
      await Promise.all(
        input.map((id, index) =>
          db.planSteps.find(id).update({ stepNumber: index + 1 }),
        ),
      );
    }),
});
