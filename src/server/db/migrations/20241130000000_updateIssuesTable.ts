import { change } from "../dbScript";

change(async (db) => {
  await db.changeTable("issues", (t) => ({
    jiraIssueDescription: t.text().nullable(),
    evaluationScore: t.float().nullable(),
    feedback: t.text().nullable(),
    didCreateGithubIssue: t.boolean().default(false),
  }));
});

// Down migration (optional)
change(async (db, up) => {
  if (!up) {
    await db.changeTable("issues", (t) => ({
      jiraIssueDescription: t.drop(),
      evaluationScore: t.drop(),
      feedback: t.drop(),
      didCreateGithubIssue: t.drop(),
    }));
  }
});
