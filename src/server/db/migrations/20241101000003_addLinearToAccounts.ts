import { change } from "~/server/db/db";

export default change(async (db) => {
  await db.changeTable("accounts", (t) => ({
    linearAccessToken: t.text().nullable(),
    linearRefreshToken: t.text().nullable(),
    linearTokenExpiresAt: t.timestamp().nullable(),
  }));
});
