import { change } from "../dbScript";

change(async (db) => {
  await db.createEnum("onboarding_status", ["none", "ready", "done"]);
});
