import { BaseTable } from "../baseTable";

export class AccountsTable extends BaseTable {
  readonly table = "accounts";
  columns = this.setColumns((t) => ({
    id: t.serial().primaryKey(),
    userId: t.integer(),
    isTeamAdmin: t.boolean().default(false),
    teamAdminAccountId: t.integer().nullable(),
    type: t.varchar(255),
    provider: t.varchar(255),
    providerAccountId: t.varchar(255),
    refresh_token: t.text(0, Infinity),
    access_token: t.text(0, Infinity),
    expires_at: t.bigint(),
    id_token: t.text(0, Infinity),
    scope: t.text(0, Infinity),
    session_state: t.text(0, Infinity),
    token_type: t.text(0, Infinity),
    jiraAccessToken: t.text(0, Infinity).nullable(),
    jiraRefreshToken: t.text(0, Infinity).nullable(),
    jiraUsername: t.text(0, Infinity).nullable(),
    linearAccessToken: t.text(0, Infinity).nullable(),
    linearRefreshToken: t.text(0, Infinity).nullable(),
    linearUsername: t.text(0, Infinity).nullable(),
    zendeskAccessToken: t.text(0, Infinity).nullable(),
    zendeskRefreshToken: t.text(0, Infinity).nullable(),
    zendeskUsername: t.text(0, Infinity).nullable(),
    refresh_token_expires_in: t.integer().nullable(),
  }));
}
