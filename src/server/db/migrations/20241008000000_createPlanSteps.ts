import { change } from "../dbScript";

change(async (db) => {
  await db.createTable("plan_steps", (t) => ({
    id: t.identity().primaryKey(),
    projectId: t.integer().foreignKey("projects", "id", {
      onDelete: "CASCADE",
    }),
    issueNumber: t.integer(),
    stepNumber: t.integer(),
    filePath: t.text().nullable(),
    instructions: t.text(),
    exitCriteria: t.text().nullable(),
    ...t.timestamps(),
  }));
});
