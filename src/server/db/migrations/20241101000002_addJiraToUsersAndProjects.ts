import { change } from "../dbScript";

change(async (db) => {
  await db.changeTable("users", (t) => ({
    jiraRefreshToken: t.text().nullable(),
  }));
});

change(async (db) => {
  await db.changeTable("projects", (t) => ({
    jiraCloudId: t.text().nullable(),
  }));
});
