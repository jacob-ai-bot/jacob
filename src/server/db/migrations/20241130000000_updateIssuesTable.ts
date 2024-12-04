import { change } from "../dbScript";

change(async (db) => {
  await db.changeTable("issues", (t) => ({
    jiraIssueDescription: t.text().nullable(),
    evaluationScore: t.real().nullable(),
    feedback: t.text().nullable(),
    didCreateGithubIssue: t.boolean().default(false),
  }));
});
