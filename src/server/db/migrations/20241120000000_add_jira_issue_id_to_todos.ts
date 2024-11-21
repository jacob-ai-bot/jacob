import { sql } from "orchid-orm";

export async function up() {
  await sql`
    ALTER TABLE todos
    ADD COLUMN jira_issue_id text;
  `;
}

export async function down() {
  await sql`
    ALTER TABLE todos
    DROP COLUMN jira_issue_id;
  `;
}
