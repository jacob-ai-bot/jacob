import { Migration } from "orchid-orm";

export default new Migration(async (db) => {
  await db.schema.alterTable("users", (table) => {
    table.addColumn("jiraToken", "text", (col) => col.nullable());
  });
});
