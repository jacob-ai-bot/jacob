import { change } from "../dbScript";

change(async (db) => {
  await db.changeTable("todos", (t) => ({
    evaluationData: t.json().nullable(),
  }));
});
