import { change } from "../dbScript";

change(async (db) => {
  await db.changeTable("users", (t) => ({
    jiraRefreshToken: t.text().nullable(),
    jiraCloudId: t.varchar(255).nullable(),
  }));
});
