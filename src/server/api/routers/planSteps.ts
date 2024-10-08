import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db/db";

export const planStepsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        issueNumber: z.number().int(),
        stepNumber: z.number().int(),
        details: z.string(),
        filePath: z.string(),
      }),
    )
    .mutation(({ input }) => db.planSteps.create(input)),

  getByProjectAndIssue: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        issueNumber: z.number().int(),
      }),
    )
    .query(({ input }) =>
      db.planSteps.findMany({
        where: {
          projectId: input.projectId,
          issueNumber: input.issueNumber,
          isActive: true,
        },
        orderBy: { stepNumber: "asc" },
      }),
    ),

  getById: protectedProcedure
    .input(z.string().uuid())
    .query(({ input }) =>
      db.planSteps.findUnique({ where: { id: input, isActive: true } }),
    ),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        details: z.string().optional(),
        filePath: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return db.planSteps.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(({ input }) =>
      db.planSteps.update({ where: { id: input }, data: { isActive: false } }),
    ),

  reorder: protectedProcedure
    .input(z.array(z.string().uuid()))
    .mutation(async ({ input }) => {
      await db.$transaction(
        input.map((id, index) =>
          db.planSteps.update({
            where: { id },
            data: { stepNumber: index + 1 },
          }),
        ),
      );
    }),
});
