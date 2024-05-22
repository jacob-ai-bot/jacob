import { describe, test, expect } from "vitest";
import { ormFactory } from "orchid-orm-test-factory";
import { DateTime } from "luxon";

import { db } from "~/server/db/db";
import { useTestDatabase } from "./testHelpers";
import { purgeEvents } from "./events";

const factory = ormFactory(db);

describe("purgeEvents", () => {
  useTestDatabase();

  test("purges events older than 14 days", async () => {
    const project = await factory.projects.create({
      repoId: "123456789",
      repoName: "bar",
    });
    await factory.events.create({
      projectId: project.id,
      userId: "123",
    });
    await factory.events.create({
      projectId: project.id,
      userId: "123",
      createdAt: DateTime.now().minus({ weeks: 3 }).toMillis(),
    });

    expect(await db.events.count()).toBe(2);

    await purgeEvents();

    expect(await db.events.count()).toBe(1);
  });
});
