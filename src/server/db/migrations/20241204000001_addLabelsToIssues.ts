import { change } from "db/migration";

change(async (db) => {
  await db.changeTable("issues", (t) => ({
    labels: t.json().default([]),
  }));
});
