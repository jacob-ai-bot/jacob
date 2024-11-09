import { BaseTable } from "../baseTable";
import { playbookSchema } from "~/server/schema/playbookSchema";

export class PlaybooksTable extends BaseTable {
  readonly table = "playbooks";
  columns = this.setColumns((t) => ({
    id: t.identity().primaryKey(),
    userId: t.integer().foreignKey("users", "id"),
    projectId: t.integer().foreignKey("projects", "id"),
    name: t.text(),
    description: t.text(),
    playbookData: t.jsonb(playbookSchema),
    createdAt: t.timestampWithTimeZone().defaultNow(),
    updatedAt: t.timestampWithTimeZone().defaultNow(),
  }));
}
