import { change } from "../dbScript";
import { TodoStatus } from "../enums";

const todoStatusValues = Object.values(TodoStatus) as [string, ...string[]];

change(async (db, up) => {
  if (up) {
    await db.createEnum("todo_status", todoStatusValues);
  }

  await db.createTable("todos", (t) => ({
    id: t.identity().primaryKey(),
    projectId: t.integer().foreignKey("projects", "id"),
    description: t.text(),
    name: t.text(),
    status: t.enum("todo_status"),
    issueId: t.integer().nullable(),
    position: t.integer().default(0),
    branch: t.text().nullable(),
    isArchived: t.boolean().default(false),
    ...t.timestamps(),
  }));

  if (!up) {
    // Drop the enum AFTER we drop the table when we are rolling back
    await db.dropEnum("todo_status", todoStatusValues);
  }
});
