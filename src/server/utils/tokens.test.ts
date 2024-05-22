import { describe, test, expect } from "vitest";
import { ormFactory } from "orchid-orm-test-factory";
import { DateTime } from "luxon";

import { db } from "~/server/db/db";
import { useTestDatabase } from "./testHelpers";
import { purgeTokens } from "./tokens";

const factory = ormFactory(db);

describe("purgeTokens", () => {
  useTestDatabase();

  test("purges tokens that have expired", async () => {
    await factory.tokens.create({
      expiresAt: DateTime.now().plus({ hours: 1 }).toMillis(),
    });
    await factory.tokens.create({
      expiresAt: DateTime.now().minus({ seconds: 1 }).toMillis(),
    });

    expect(await db.tokens.count()).toBe(2);

    await purgeTokens();

    expect(await db.tokens.count()).toBe(1);
  });
});
