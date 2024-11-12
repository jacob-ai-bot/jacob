import { type Selectable } from "orchid-orm";
import { BaseTable } from "../baseTable";
import { IssueBoardSource } from "~/types";

const ISSUE_SOURCE_VALUES = Object.values(IssueBoardSource) as [
  string,
  ...string[],
];

export type Webhook = Selectable<WebhooksTable>;

export class WebhooksTable extends BaseTable {
  readonly table = "webhooks";
  columns = this.setColumns((t) => ({
    id: t.identity().primaryKey(),
    issueSource: t.enum("issue_source", ISSUE_SOURCE_VALUES),
    projectId: t.integer().foreignKey("projects", "id", {
      onDelete: "CASCADE",
    }),
    webhookId: t.varchar(255),
    createdBy: t.integer().foreignKey("users", "id"),
    ...t.timestamps(),
  }));
}
