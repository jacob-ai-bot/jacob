import { change } from "../dbScript";

const providerValues = ["GitHub", "Jira"] as const;

change(async (db) => {
  await db.createTable("issue_sources", (t) => ({
    id: t.identity().primaryKey(),
    provider: t.enum("provider", providerValues),
    projectId: t.integer().foreignKey("projects", "id", {
      onDelete: "CASCADE",
    }),
    boardId: t.varchar(255),
    boardUrl: t.text(),
    boardName: t.text(),
    isActive: t.boolean().default(true),
    ...t.timestamps(),
  }));
});
