import { change } from "~/server/db/db";

export default change(async (db) => {
  await db.changeTable("projects", (t) => ({
    linearBoardId: t.text().nullable(),
  }));
});
