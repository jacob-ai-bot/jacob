import { BaseTable } from "../baseTable";

export class UsersTable extends BaseTable {
  readonly table = "users";
  columns = this.setColumns((t) => ({
    id: t.identity().primaryKey(),
    name: t.varchar(255).nullable(),
    email: t.varchar(255).nullable(),
    emailVerified: t
      .timestamp()
      .nullable()
      .parse((value) => (value ? new Date(value) : value))
      .as(t.integer()),
    image: t.text(0, Infinity).nullable(),
    login: t.text().nullable(),
    role: t.enum("user_role", ["user", "admin"]).default("user"),
    ...t.timestamps(),
  }));
}
