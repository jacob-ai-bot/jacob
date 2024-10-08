import { BaseTable } from "../baseTable";
import { sql } from "orchid-orm";

export class PlanStepsTable extends BaseTable {
  readonly table = "plan_steps";
  columns = this.setColumns((t) => ({
    id: t
      .uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    projectId: t.uuid().foreignKey("projects", "id"),
    issueNumber: t.integer().notNull(),
    stepNumber: t.integer().notNull(),
    details: t.text().notNull(),
    filePath: t.text().notNull(),
    isActive: t.boolean().default(true),
    ...t.timestamps(),
  }));
}
