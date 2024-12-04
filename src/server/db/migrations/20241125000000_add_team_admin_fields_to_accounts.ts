import { change } from "../dbScript";

change(
  async (db) => {
    await db.changeTable("accounts", (t) => ({
      isTeamAdmin: t.boolean().default(false),
      teamAdminAccountId: t.integer().nullable(),
      jiraUsername: t.text(0, Infinity).nullable(),
      linearUsername: t.text(0, Infinity).nullable(),
    }));
  },
  async (db) => {
    await db.changeTable("accounts", (t) => ({
      isTeamAdmin: t.drop(),
      teamAdminAccountId: t.drop(),
      jiraUsername: t.drop(),
      linearUsername: t.drop(),
    }));
  },
);
