import { change } from "../dbScript";

change(async (db) => {
  await db.changeTable("accounts", (t) => ({
    linearAccessToken: t.text().nullable(),
    linearRefreshToken: t.text().nullable(),
  }));
});

change(async (db) => {
  await db.changeTable("projects", (t) => ({
    linearProjectId: t.text().nullable(),
  }));
});
