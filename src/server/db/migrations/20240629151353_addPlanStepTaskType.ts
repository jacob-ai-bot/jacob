import { change } from "../dbScript";

change(async (db, up) => {
  if (up) {
    await db.adapter.query(
      `ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'plan step' AFTER 'plan'`,
    );
  }
});
