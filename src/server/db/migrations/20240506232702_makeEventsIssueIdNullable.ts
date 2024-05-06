import { change } from "../dbScript";

change(async (db) => {
  await db.changeTable("events", (t) => ({
    issueId: t.change(t.integer(), t.integer().nullable()),
  }));
});
