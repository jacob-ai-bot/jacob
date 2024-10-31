import { change } from "../dbScript";

change(async (db) => {
  await db.changeTable("users", (t) => ({
    jiraToken: t.text().nullable(),
  }));
});
