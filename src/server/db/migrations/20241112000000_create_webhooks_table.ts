import { change } from "../dbScript";

change(async (db) => {
  await db.createTable("webhooks", (t) => ({
    id: t.identity().primaryKey(),
    issueSource: t.enum("issue_source"),
    projectId: t.integer().foreignKey("projects", "id", {
      onDelete: "CASCADE",
    }),
    webhookId: t.varchar(255),
    createdBy: t.integer().foreignKey("users", "id"),
    ...t.timestamps(),
  }));
});
