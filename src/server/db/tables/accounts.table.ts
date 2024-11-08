import { BaseTable } from "../baseTable";

export class AccountsTable extends BaseTable {
  readonly table = "accounts";
  columns = this.setColumns((t) => ({
    id: t.serial().primaryKey(),
    userId: t.integer(),
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
    refresh_token_expires_in: t.integer().nullable(),
    linearAccessToken: t.text(0, Infinity).nullable(),
    linearRefreshToken: t.text(0, Infinity).nullable(),
  }));
}
