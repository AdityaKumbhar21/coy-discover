import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createSeedData } from "../../backend/scripts/seed-data";
import { createTestDatabase } from "../helpers/database";
import { profiles, matches, swipes } from "@/server/db/schema";
import { seedDatabase } from "@/server/db/seed";

describe("demo seed", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  beforeEach(async () => {
    database = await createTestDatabase();
  });
  afterEach(async () => {
    await database?.cleanup();
  });

  async function snapshot() {
    return {
      profiles: await database.db.select().from(profiles).orderBy(profiles.id),
      swipes: await database.db
        .select()
        .from(swipes)
        .orderBy(swipes.actorId, swipes.targetId),
      matches: await database.db.select().from(matches).orderBy(matches.id),
    };
  }

  it("seeds 30 complete candidates plus a separate demo user and incoming likes", async () => {
    await seedDatabase(database.db, createSeedData(1));
    const data = await snapshot();
    expect(data.profiles).toHaveLength(31);
    expect(new Set(data.profiles.map((profile) => profile.id)).size).toBe(31);
    for (const profile of data.profiles) {
      expect(profile.name.trim()).not.toBe("");
      expect(profile.age).toBeGreaterThanOrEqual(18);
      expect(profile.age).toBeLessThanOrEqual(99);
      expect(profile.photoUrl).toBe("/images/profile-placeholder.svg");
      expect(profile.bio.trim()).not.toBe("");
      expect(profile.cityOrCollege.trim()).not.toBe("");
      expect(profile.interests.length).toBeGreaterThan(0);
      expect(
        profile.interests.every((interest) => interest.trim().length > 0),
      ).toBe(true);
    }
    expect(data.swipes).toHaveLength(3);
    expect(
      data.swipes.every(
        (swipe) =>
          swipe.actorId !== 1 &&
          swipe.targetId === 1 &&
          swipe.decision === "like",
      ),
    ).toBe(true);
    expect(data.swipes.some((swipe) => swipe.actorId === 1001)).toBe(true);
    expect(data.matches).toEqual([]);
  });

  it("is byte-for-value deterministic and idempotent on repeated seed runs", async () => {
    await seedDatabase(database.db, createSeedData(1));
    const first = await snapshot();
    await seedDatabase(database.db, createSeedData(1));
    expect(await snapshot()).toEqual(first);
  });

  it("preserves recorded decisions, matches, timestamps, and existing profiles", async () => {
    await seedDatabase(database.db, createSeedData(1));
    await database.db.insert(swipes).values([
      { actorId: 1, targetId: 1001, decision: "like", createdAt: 10 },
      { actorId: 1, targetId: 1002, decision: "pass", createdAt: 20 },
    ]);
    await database.db
      .insert(matches)
      .values({ profileLowId: 1, profileHighId: 1001, createdAt: 30 });
    await database.db
      .update(profiles)
      .set({ bio: "Preserve this existing bio." })
      .where(eq(profiles.id, 1001));
    // A conflicting pre-existing incoming decision must also survive reseeding.
    await database.db
      .update(swipes)
      .set({ decision: "pass", createdAt: 40 })
      .where(eq(swipes.actorId, 1007));
    const before = await snapshot();
    await seedDatabase(database.db, createSeedData(1));
    expect(await snapshot()).toEqual(before);
  });

  it("supports a noncolliding server-selected demo ID", async () => {
    await seedDatabase(database.db, createSeedData(42));
    const data = await snapshot();
    expect(data.profiles.some((profile) => profile.id === 42)).toBe(true);
    expect(data.swipes.every((swipe) => swipe.targetId === 42)).toBe(true);
  });

  it("rejects a demo ID colliding with a stable candidate ID", () => {
    expect(() => createSeedData(1001)).toThrow("reserved candidate IDs");
  });

  it.each([
    [
      "fractional age",
      (data: ReturnType<typeof createSeedData>) => ({
        ...data,
        profiles: data.profiles.map((profile) => ({ ...profile, age: 20.5 })),
      }),
    ],
    [
      "unsafe photo",
      (data: ReturnType<typeof createSeedData>) => ({
        ...data,
        profiles: data.profiles.map((profile) => ({
          ...profile,
          photoUrl: "http://example.com/photo",
        })),
      }),
    ],
    [
      "duplicate profiles",
      (data: ReturnType<typeof createSeedData>) => ({
        ...data,
        profiles: [...data.profiles, data.profiles[0]],
      }),
    ],
    [
      "missing demo",
      (data: ReturnType<typeof createSeedData>) => ({
        ...data,
        demoUserId: 999,
      }),
    ],
    [
      "unknown field",
      (data: ReturnType<typeof createSeedData>) => ({
        ...data,
        incomingLikes: 3,
      }),
    ],
    [
      "outgoing seed likes",
      (data: ReturnType<typeof createSeedData>) => ({
        ...data,
        swipes: data.swipes.map((swipe) => ({
          ...swipe,
          actorId: 1,
          targetId: 1001,
        })),
      }),
    ],
  ])("validates %s before any insert", async (_name, invalid) => {
    await expect(
      seedDatabase(database.db, invalid(createSeedData(1))),
    ).rejects.toThrow("Invalid seed data");
    expect(await snapshot()).toEqual({ profiles: [], swipes: [], matches: [] });
  });

  it("rolls back all seeded profiles when a later swipe insert fails", async () => {
    // Failure injection is test-only; the application has no matching triggers.
    await database.client.execute(
      "CREATE TRIGGER fail_seed BEFORE INSERT ON swipes BEGIN SELECT RAISE(ABORT, 'injected failure'); END",
    );
    await expect(
      seedDatabase(database.db, createSeedData(1)),
    ).rejects.toThrow();
    expect(await snapshot()).toEqual({ profiles: [], swipes: [], matches: [] });
  });
});
