import { db } from "../db";

export async function up() {
  await db.createMigration("add_jira_issue_id_to_todos", async () => {
    await db.alterTable("todos", (t) => ({
      jiraIssueId: t.text().nullable(),
    }));
  });
}

export async function down() {
  await db.createMigration("remove_jira_issue_id_from_todos", async () => {
    await db.alterTable("todos", (t) => ({
      jiraIssueId: t.dropColumn(),
    }));
  });
}
