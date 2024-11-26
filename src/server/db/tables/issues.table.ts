import { BaseTable } from "../baseTable";

export class IssuesTable extends BaseTable {
  readonly table = "issues";
  columns = this.setColumns((t) => ({
    id: t.identity().primaryKey(),
    issueBoardId: t.integer().foreignKey("issueBoards", "id", {
      onDelete: "CASCADE",
    }),
    issueId: t.varchar(255),
    title: t.text().nullable(),
    jiraIssueDescription: t.text().nullable(),
    evaluationScore: t.numeric().nullable(),
    feedback: t.text().nullable(),
    didCreateGithubIssue: t.boolean().default(false),
    ...t.timestamps(),
  }));
}
