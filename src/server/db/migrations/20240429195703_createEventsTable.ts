import { change } from "../dbScript";

const taskTypeValues = [
  "task",
  "code",
  "design",
  "terminal",
  "plan",
  "prompt",
  "issue",
  "pull request",
  "command",
] as [string, ...string[]];

change(async (db, up) => {
  if (up) {
    await db.createEnum("task_type", taskTypeValues);
  }
  await db.createTable("events", (t) => ({
    id: t.identity().primaryKey(),
    projectId: t.integer().foreignKey("projects", "id"),
    userId: t.text(),
    repoFullName: t.text(),
    issueId: t.integer(),
    type: t.enum("task_type"),
    payload: t.json().nullable(),
    ...t.timestamps(),
  }));
  if (!up) {
    // Drop the enum AFTER we drop the table when we are rolling back
    await db.createEnum("task_type", taskTypeValues);
  }
});
