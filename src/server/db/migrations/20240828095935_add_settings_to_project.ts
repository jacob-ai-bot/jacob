import { change } from "../dbScript";

change(async (db) => {
  await db.changeTable("projects", (t) => ({
    settings: t.json().default({}),
  }));
});
