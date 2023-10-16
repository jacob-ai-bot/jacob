import { BaseTable } from "../baseTable";

export class TokensTable extends BaseTable {
  readonly table = "tokens";
  columns = this.setColumns((t) => ({
    readKey: t.uuid().primaryKey(),
    writeKey: t
      .uuid()
      .default(t.sql`gen_random_uuid()`)
      .unique(),
    accessToken: t.text(0, Infinity).nullable(),
    expiresAt: t
      .timestamp()
      .parse((value) => (value ? new Date(value) : value))
      .as(t.integer())
      .default(t.sql`now() + interval '1 hour'`),
    ...t.timestamps(),
  }));
}
