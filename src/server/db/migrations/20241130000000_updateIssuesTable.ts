import { type Kysely } from "kysely";
import { change } from "../dbScript";

export const up = async (db: Kysely<any>) => {
  await db.alterTable("issues", (t: any) => {
    t.text("jiraIssueDescription").nullable();
    t.numeric("evaluationScore").nullable();
    t.text("feedback").nullable();
    t.boolean("didCreateGithubIssue").default(false);
  });
};

export const down = async (db: Kysely<any>) => {
  await db.alterTable("issues", (t: any) => {
    t.dropColumn("jiraIssueDescription");
    t.dropColumn("evaluationScore");
    t.dropColumn("feedback");
    t.dropColumn("didCreateGithubIssue");
  });
};
