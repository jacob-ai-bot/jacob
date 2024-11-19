import { change } from "../dbScript";

change(async (db) => {
  await db.changeTable("research", (t) => ({
    projectId: t.integer().foreignKey("projects", "id").nullable(),
  }));
});
