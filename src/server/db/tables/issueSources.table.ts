import { BaseTable } from "../baseTable";

const PROVIDER_VALUES = ["GitHub", "Jira"] as const;

export class IssueSourcesTable extends BaseTable {
  readonly table = "issue_sources";
  columns = this.setColumns((t) => ({
    id: t.identity().primaryKey(),
    provider: t.enum("provider", PROVIDER_VALUES),
    projectId: t.integer().foreignKey("projects", "id", {
      onDelete: "CASCADE",
    }),
    boardId: t.varchar(255),
    boardUrl: t.text(),
    boardName: t.text(),
    isActive: t.boolean().default(true),
    ...t.timestamps(),
  }));
}
