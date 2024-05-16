import { change } from "../dbScript";

change(async (db) => {
  await db.changeTable("events", (t) => ({
    pullRequestId: t.integer().nullable(),
  }));
});
