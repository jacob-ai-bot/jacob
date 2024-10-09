import type { Selectable, Insertable, Updateable, Queryable } from "orchid-orm";
import { BaseTable } from "../baseTable";

export type PlanStep = Selectable<PlanStepsTable>;
export type NewPlanStep = Insertable<PlanStepsTable>;
export type PlanStepUpdate = Updateable<PlanStepsTable>;
export type PlanStepQueryable = Queryable<PlanStepsTable>;

export class PlanStepsTable extends BaseTable {
  readonly table = "plan_steps";
  columns = this.setColumns((t) => ({
    id: t.identity().primaryKey(),
    projectId: t.integer().foreignKey("projects", "id"),
    issueNumber: t.integer(),
    stepNumber: t.integer(),
    filePath: t.text().nullable(),
    instructions: t.text(),
    exitCriteria: t.text().nullable(),
    isActive: t.boolean().default(true),
    ...t.timestamps(),
  }));
}
