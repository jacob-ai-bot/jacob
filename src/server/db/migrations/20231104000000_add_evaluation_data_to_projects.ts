import { change } from "../dbScript";

change(async (db) => {
  await db.changeTable("projects", (t) => ({
    evaluationData: t.json().nullable(),
  }));
});
