import { Migration } from "orchid-orm";

export default Migration.fromRuntime(async (db) => {
  await db.schema.alterTable("users", (t) => {
    t.text("jiraToken").nullable();
  });
});
