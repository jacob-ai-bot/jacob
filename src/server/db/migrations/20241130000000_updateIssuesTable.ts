import { change } from "../dbScript";

export const up = async (db) => {
  await db.alterTable("issues", (t) => {
    t.text("jiraIssueDescription").nullable();
    t.numeric("evaluationScore").nullable();
    t.text("feedback").nullable();
    t.boolean("didCreateGithubIssue").default(false);
  });
};

export const down = async (db) => {
  await db.alterTable("issues", (t) => {
    t.dropColumn("jiraIssueDescription");
    t.dropColumn("evaluationScore");
    t.dropColumn("feedback");
    t.dropColumn("didCreateGithubIssue");
  });
};
