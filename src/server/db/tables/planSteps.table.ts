import type { Selectable, Insertable, Updateable, Queryable } from "orchid-orm";
import { BaseTable } from "../baseTable";
import { PlanningAgentActionType } from "../enums";

const PLANNING_ACTION_TYPE_VALUES = Object.values(PlanningAgentActionType) as [
  PlanningAgentActionType,
  ...PlanningAgentActionType[],
];

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
    type: t.enum("planning_action_type_values", PLANNING_ACTION_TYPE_VALUES),
    title: t.text(),
    instructions: t.text(),
    filePath: t.text(),
    exitCriteria: t.text().nullable(),
    dependencies: t.text().nullable(),
    isActive: t.boolean().default(true),
    ...t.timestamps(),
  }));
}
