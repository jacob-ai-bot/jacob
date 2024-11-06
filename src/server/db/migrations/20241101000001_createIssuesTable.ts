import { change } from "../dbScript";

const issueSourceValues = ["GitHub", "Jira"] as [string, ...string[]];

change(async (db, up) => {
  if (up) {
    await db.createEnum("issue_source", issueSourceValues);
  }
  await db.createTable("issue_boards", (t) => ({
    id: t.identity().primaryKey(),
    issueSource: t.enum("issue_source"),
    projectId: t.integer().foreignKey("projects", "id", {
      onDelete: "CASCADE",
    }),
    repoFullName: t.varchar(255),
    originalBoardId: t.varchar(255),
    boardUrl: t.text(),
    boardName: t.text(),
    createdBy: t.integer().foreignKey("users", "id"),
    ...t.timestamps(),
  }));

  await db.createTable("issues", (t) => ({
    id: t.identity().primaryKey(),
    issueBoardId: t.integer().foreignKey("issue_boards", "id", {
      onDelete: "CASCADE",
    }),
    issueId: t.varchar(255),
    title: t.text().nullable(),
    ...t.timestamps(),
  }));

  if (!up) {
    await db.dropEnum("issue_source", issueSourceValues);
  }
});
