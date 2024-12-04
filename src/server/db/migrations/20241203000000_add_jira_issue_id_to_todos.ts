import { change } from "../dbScript";

change(async (db) => {
  await db.changeTable("todos", (t) => ({
    originalIssueId: t.integer().foreignKey("issues", "id").nullable(),
  }));

  await db.changeTable("issues", (t) => ({
    githubIssueId: t.integer().nullable(),
    fullRepoName: t.varchar(255).nullable(),
  }));
});
