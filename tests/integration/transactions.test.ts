import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSeedData } from "../../backend/scripts/seed-data";
import { createTestDatabase } from "../helpers/database";
import { profiles, swipes, matches } from "@/server/db/schema";
import { seedDatabase } from "@/server/db/seed";

describe("local libSQL write transactions", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  beforeEach(async () => {
    database = await createTestDatabase();
    await seedDatabase(database.db, createSeedData(1));
  });
  afterEach(async () => {
    await database?.cleanup();
  });

  it("rolls back related swipe and match writes together", async () => {
    await expect(
      database.db.transaction(async (tx) => {
        await tx.insert(swipes).values({
          actorId: 1,
          targetId: 1001,
          decision: "like",
          createdAt: 0,
        });
        await tx
          .insert(matches)
          .values({ profileLowId: 1, profileHighId: 1001, createdAt: 0 });
        throw new Error("injected failure before commit");
      }),
    ).rejects.toThrow("injected failure");
    expect(await database.db.select().from(matches)).toEqual([]);
    expect(await database.db.select().from(swipes)).toHaveLength(3);
  });

  it("acquires the write lock before the first read and serializes independent connections", async () => {
    const second = await database.connect();
    await database.db.transaction(async (tx) => {
      // No write (or read) has been issued yet: BEGIN IMMEDIATE holds the lock.
      await expect(second.client.transaction("write")).rejects.toMatchObject({
        code: "SQLITE_BUSY",
      });
      // Dispose a contended native client rather than reusing failed BEGIN state.
      second.client.close();
      await tx.select().from(profiles);
      await tx
        .insert(swipes)
        .values({ actorId: 1, targetId: 1002, decision: "pass", createdAt: 1 });
    });
    const retry = await database.connect();
    await retry.db.transaction(async (tx) => {
      const rows = await tx.select().from(swipes);
      expect(rows).toHaveLength(4);
      await tx
        .insert(swipes)
        .values({ actorId: 1, targetId: 1003, decision: "pass", createdAt: 2 });
    });
    expect(await database.db.select().from(swipes)).toHaveLength(5);
  });
});
