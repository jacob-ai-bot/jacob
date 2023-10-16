import { change } from "../dbScript";

change(async (db) => {
  await db.createTable("tokens", (t) => ({
    readKey: t.uuid().primaryKey(),
    writeKey: t
      .uuid()
      .default(t.sql`gen_random_uuid()`)
      .unique(),
    accessToken: t.text().nullable(),
    expiresAt: t.timestamp().default(t.sql`now() + interval '1 hour'`),
    ...t.timestamps(),
  }));
});
