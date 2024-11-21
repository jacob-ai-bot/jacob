import { change } from "../dbScript";

change(async (db) => {
  await db.changeTable("projects", (t) => ({
    agentEnabled: t.boolean().default(false),
  }));
});
