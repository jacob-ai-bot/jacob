import { change } from "../dbScript";

change(async (db) => {
  await db.changeTable("users", (t) => ({
    dashboardEnabled: t.boolean().default(false),
  }));
});
