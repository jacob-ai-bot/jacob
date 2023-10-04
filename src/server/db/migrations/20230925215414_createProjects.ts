import { change } from "../dbScript";

change(async (db) => {
  await db.createTable("projects", (t) => ({
    id: t.identity().primaryKey(),
    repoId: t.bigint().unique(),
    repoNodeId: t.string().unique(),
    repoName: t.text(),
    repoFullName: t.text().unique(),
    ...t.timestamps(),
  }));
});
