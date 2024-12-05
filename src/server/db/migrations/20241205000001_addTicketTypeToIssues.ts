import { change } from "../dbScript";

change(async (db) => {
  await db.changeTable("issues", (t) => ({
    ticketType: t.varchar(255).nullable(),
  }));
});
