import { change } from "../dbScript";

change(async (db) => {
  await db.changeTable("accounts", (t) => ({
    linearAccessToken: t.text().nullable(),
    linearRefreshToken: t.text().nullable(),
  }));
});

change(async (db) => {
  await db.changeTable("projects", (t) => ({
    linearTeamId: t.text().nullable(),
  }));
});

change(async (db, up) => {
  if (up) {
    await db.adapter.query(
      `ALTER TYPE issue_source ADD VALUE IF NOT EXISTS 'Linear' AFTER 'Jira'`,
    );
  }
});
