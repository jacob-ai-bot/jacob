import { change } from "../dbScript";

change(async (db) => {
  await db.changeTable("projects", (t) => ({
    buildStatus: t.boolean().nullable(),
    lastBuildAt: t.timestamp().nullable(),
    buildError: t.text(0, 65535).nullable(),
  }));
});