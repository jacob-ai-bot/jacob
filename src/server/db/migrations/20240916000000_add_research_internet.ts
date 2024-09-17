import { change } from "../dbScript";

change(async (db, up) => {
  if (up) {
    await db.adapter.query(
      `ALTER TYPE research_type_values ADD VALUE IF NOT EXISTS 'ResearchInternet' AFTER 'ResearchCodebase'`,
    );
  }
});
