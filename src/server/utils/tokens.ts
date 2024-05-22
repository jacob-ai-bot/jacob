import { DateTime } from "luxon";

import { db } from "~/server/db/db";

export function purgeTokens() {
  return db.tokens
    .where({
      expiresAt: {
        lte: DateTime.now().toISO() as unknown as number,
      },
    })
    .delete();
}
