import { change } from "~/server/db/db";

export default change(async (db) => {
  await db.changeTable("accounts", (t) => ({
    linearAccessToken: t.text(0, Infinity).nullable(),
    linearRefreshToken: t.text(0, Infinity).nullable(),
  }));

  await db.changeTable("projects", (t) => ({
    linearBoardId: t.text().nullable(),
  }));
});
