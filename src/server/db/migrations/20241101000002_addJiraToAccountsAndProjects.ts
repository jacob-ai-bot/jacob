import { change } from "../dbScript";

change(async (db) => {
  await db.changeTable("accounts", (t) => ({
    refresh_token_expires_in: t.integer().nullable(),
    jiraAccessToken: t.text().nullable(),
    jiraRefreshToken: t.text().nullable(),
  }));
});

change(async (db) => {
  await db.changeTable("projects", (t) => ({
    jiraCloudId: t.text().nullable(),
  }));
});
