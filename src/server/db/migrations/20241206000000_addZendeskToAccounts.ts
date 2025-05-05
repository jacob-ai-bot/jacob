import { BaseMigration } from "../baseMigration";

export default class AddZendeskToAccounts extends BaseMigration {
  async change(db) {
    await db.changeTable("accounts", (t) => ({
      zendeskAccessToken: t.text().nullable(),
      zendeskRefreshToken: t.text().nullable(),
      zendeskUsername: t.text().nullable(),
    }));
  }
}
