import { change } from "../dbScript";

const issueSourceValues = ["GitHub", "Jira"] as [string, ...string[]];

change(async (db) => {
  await db.createTable("issues", (t) => ({
    id: t.identity().primaryKey(),
    issueBoardId: t.integer().foreignKey("issueBoards", "id", {
      onDelete: "CASCADE",
    }),
    todoId: t
      .integer()
      .foreignKey("todos", "id", {
        onDelete: "CASCADE",
      })
      .nullable(),
    issueId: t.varchar(255),
    title: t.text().nullable(),
    ...t.timestamps(),
  }));
});

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
    ...t.timestamps(),
  }));
  if (!up) {
    await db.dropEnum("issue_source", issueSourceValues);
  }
});
