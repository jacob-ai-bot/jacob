import { change } from "../dbScript";

change(async (db) => {
  await db.createTable("codebase_context", (t) => ({
    id: t.identity().primaryKey(),
    projectId: t.integer().foreignKey("projects", "id", {
      onDelete: "CASCADE",
    }),
    filePath: t.varchar(255),
    lastCommitHash: t.varchar(40),
    context: t.json().nullable(),
    ...t.timestamps(),
  }));
});
