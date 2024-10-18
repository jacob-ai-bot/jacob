import { change } from "../dbScript";

change(async (db) => {
  await db.changeTable("accounts", (t) => ({
    localPath: t.text(0, Infinity).nullable(),
    doesCurrentBranchBuild: t.boolean().default(false),
  }));
});

