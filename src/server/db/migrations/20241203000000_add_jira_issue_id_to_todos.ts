import { change } from "../dbScript";

change(async (db) => {
  await db.changeTable("todos", (t) => ({
    jiraIssueId: t.text().nullable(),
  }));
});
