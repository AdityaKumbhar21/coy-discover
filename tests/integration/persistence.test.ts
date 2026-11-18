import { afterEach, describe, expect, it } from "vitest";
import { createSeedData } from "../../backend/scripts/seed-data";
import { createTestDatabase } from "../helpers/database";
import { swipes, matches } from "@/server/db/schema";
import { seedDatabase } from "@/server/db/seed";
import { migrateDatabase } from "@/server/db/migrate";

describe("file-backed persistence", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  afterEach(async () => {
    await database?.cleanup();
  });

  it("preserves likes, passes, and matches after close/reopen, migration, and reseed", async () => {
    database = await createTestDatabase();
    await seedDatabase(database.db, createSeedData(1));
    await database.db.transaction(async (tx) => {
      await tx.insert(swipes).values([
        { actorId: 1, targetId: 1001, decision: "like", createdAt: 10 },
        { actorId: 1, targetId: 1002, decision: "pass", createdAt: 20 },
      ]);
      await tx
        .insert(matches)
        .values({ profileLowId: 1, profileHighId: 1001, createdAt: 30 });
    });
    const before = {
      swipes: await database.db
        .select()
        .from(swipes)
        .orderBy(swipes.actorId, swipes.targetId),
      matches: await database.db.select().from(matches),
    };
    database.client.close();
    const reopened = await database.connect();
    await migrateDatabase(reopened.db);
    await seedDatabase(reopened.db, createSeedData(1));
    expect(
      await reopened.db
        .select()
        .from(swipes)
        .orderBy(swipes.actorId, swipes.targetId),
    ).toEqual(before.swipes);
    expect(await reopened.db.select().from(matches)).toEqual(before.matches);
  });

  it("does not persist uncommitted writes when a connection closes", async () => {
    database = await createTestDatabase();
    await seedDatabase(database.db, createSeedData(1));
    const tx = await database.client.transaction("write");
    await tx.execute("INSERT INTO swipes VALUES (1, 1002, 'pass', 0)");
    database.client.close();
    const reopened = await database.connect();
    expect(await reopened.db.select().from(swipes)).toHaveLength(3);
  });
});
