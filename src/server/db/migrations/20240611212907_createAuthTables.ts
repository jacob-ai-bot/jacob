import { change } from "../dbScript";

change(async (db) => {
  await db.createTable("accounts", (t) => ({
    id: t.serial().primaryKey(),
    userId: t.integer(),
    type: t.varchar(255),
    provider: t.varchar(255),
    providerAccountId: t.varchar(255),
    refresh_token: t.text().nullable(),
    access_token: t.text().nullable(),
    expires_at: t.bigint().nullable(),
    id_token: t.text().nullable(),
    scope: t.text().nullable(),
    session_state: t.text().nullable(),
    token_type: t.text().nullable(),
    ...t.timestamps(),
  }));

  await db.createTable("sessions", (t) => ({
    id: t.serial().primaryKey(),
    userId: t.integer(),
    expires: t.timestamp(),
    sessionToken: t.varchar(255),
    ...t.timestamps(),
  }));

  await db.createEnum("user_role", ["user", "admin"]);

  await db.createTable("users", (t) => ({
    id: t.serial().primaryKey(),
    name: t.varchar(255).nullable(),
    email: t.varchar(255).nullable(),
    emailVerified: t.timestamp().nullable(),
    login: t.text().nullable(),
    role: t.enum("user_role").default("user"),
    image: t.text().nullable(),
    ...t.timestamps(),
  }));
});
