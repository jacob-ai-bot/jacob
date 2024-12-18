import { type Selectable } from "orchid-orm";
import { BaseTable } from "../baseTable";
import { IssueBoardSource } from "~/types";

const ISSUE_SOURCE_VALUES = Object.values(IssueBoardSource) as [
  string,
  ...string[],
];

export type IssueBoard = Selectable<IssueBoardsTable>;

export class IssueBoardsTable extends BaseTable {
  readonly table = "issue_boards";
  columns = this.setColumns((t) => ({
    id: t.identity().primaryKey(),
    issueSource: t.enum("issue_source", ISSUE_SOURCE_VALUES),
    projectId: t.integer().foreignKey("projects", "id", {
      onDelete: "CASCADE",
    }),
    repoFullName: t.varchar(255),
    originalBoardId: t.varchar(255), // i.e. Jira Cloud ID
    boardUrl: t.text(),
    boardName: t.text(),
    createdBy: t.integer().foreignKey("users", "id"),
    ...t.timestamps(),
  }));
}
