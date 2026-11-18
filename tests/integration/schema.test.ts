import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { InArgs } from "@libsql/client";
import { createSeedData } from "../../backend/scripts/seed-data";
import { createTestDatabase } from "../helpers/database";
import { seedDatabase } from "@/server/db/seed";
import { migrateDatabase } from "@/server/db/migrate";
import { openDatabase } from "@/server/db/connection";

describe("migrations and database constraints", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  beforeEach(async () => {
    database = await createTestDatabase();
    await seedDatabase(database.db, createSeedData(1));
  });
  afterEach(async () => {
    await database?.cleanup();
  });

  async function rejectStatement(sql: string, args: InArgs = []) {
    await expect(database.client.execute({ sql, args })).rejects.toThrow();
  }

  it("applies committed migrations once without resetting data", async () => {
    await migrateDatabase(database.db);
    const migrations = await database.client.execute(
      "SELECT count(*) AS count FROM __drizzle_migrations",
    );
    expect(migrations.rows[0]?.count).toBe(1);
    const result = await database.client.execute(
      "SELECT count(*) AS count FROM profiles",
    );
    expect(result.rows[0]?.count).toBe(31);
    expect(
      (await database.client.execute("PRAGMA foreign_key_check")).rows,
    ).toEqual([]);
  });

  it("enables foreign keys on every independently opened connection", async () => {
    const second = await database.connect();
    for (const connection of [database, second]) {
      expect(
        (await connection.client.execute("PRAGMA foreign_keys")).rows[0]
          ?.foreign_keys,
      ).toBe(1);
      await expect(
        connection.client.execute(
          "INSERT INTO swipes VALUES (9999, 1, 'like', 0)",
        ),
      ).rejects.toThrow();
    }
  });

  it.each([
    ["zero ID", { id: 0 }],
    ["unsafe ID", { id: 9007199254740992 }],
    ["underage", { age: 17 }],
    ["age too high", { age: 100 }],
    ["fractional age", { age: 20.5 }],
    ["blank name", { name: " " }],
    ["blank photo", { photo: " " }],
    ["blank bio", { bio: " " }],
    ["blank location", { location: " " }],
    ["malformed interests", { interests: "[" }],
    ["non-array interests", { interests: "{}" }],
    ["empty interests", { interests: "[]" }],
    ["null interests", { interests: null }],
  ])("rejects invalid profile: %s", async (_name, changes) => {
    const row = {
      id: 9000,
      name: "Test",
      age: 24,
      photo: "/photo.svg",
      bio: "A bio",
      location: "Pune",
      interests: '["Books"]',
      ...changes,
    };
    await rejectStatement(
      "INSERT INTO profiles (id, name, age, photo_url, bio, city_or_college, interests) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        row.id,
        row.name,
        row.age,
        row.photo,
        row.bio,
        row.location,
        row.interests,
      ],
    );
  });

  it.each([
    ["duplicate direction", 1001, 1, "pass", 0],
    ["self swipe", 1, 1, "like", 0],
    ["unknown actor", 9999, 1, "like", 0],
    ["unknown target", 1, 9999, "pass", 0],
    ["invalid decision", 1, 1002, "maybe", 0],
    ["negative timestamp", 1, 1002, "pass", -1],
    ["fractional timestamp", 1, 1002, "pass", 1.5],
    ["unsafe timestamp", 1, 1002, "pass", 9007199254740992],
  ])(
    "rejects invalid swipe: %s",
    async (_name, actor, target, decision, time) => {
      await rejectStatement("INSERT INTO swipes VALUES (?, ?, ?, ?)", [
        actor,
        target,
        decision,
        time,
      ]);
    },
  );

  it("allows opposite directed swipes but only one canonical match", async () => {
    await database.client.execute(
      "INSERT INTO swipes VALUES (1, 1001, 'like', 0)",
    );
    await database.client.execute(
      "INSERT INTO matches (profile_low_id, profile_high_id, created_at) VALUES (1, 1001, 0)",
    );
    await rejectStatement(
      "INSERT INTO matches (profile_low_id, profile_high_id, created_at) VALUES (1, 1001, 1)",
    );
    await rejectStatement(
      "INSERT INTO matches (profile_low_id, profile_high_id, created_at) VALUES (1001, 1, 1)",
    );
  });

  it.each([
    ["self pair", 1, 1, 0],
    ["missing low profile", 2, 1001, 0],
    ["missing high profile", 1, 9999, 0],
    ["negative time", 1, 1002, -1],
    ["fractional time", 1, 1002, 1.5],
  ])("rejects invalid match: %s", async (_name, low, high, time) => {
    await rejectStatement(
      "INSERT INTO matches (profile_low_id, profile_high_id, created_at) VALUES (?, ?, ?)",
      [low, high, time],
    );
  });

  it("restricts deletion of profiles referenced by swipes or matches", async () => {
    await database.client.execute(
      "INSERT INTO swipes VALUES (1, 1002, 'like', 0), (1002, 1, 'like', 0)",
    );
    await database.client.execute(
      "INSERT INTO matches (profile_low_id, profile_high_id, created_at) VALUES (1, 1002, 0)",
    );
    await rejectStatement("DELETE FROM profiles WHERE id = 1");
    await rejectStatement("DELETE FROM profiles WHERE id = 1002");
  });

  it("fails closed for unverified remote connections before network access", async () => {
    await expect(
      openDatabase({
        DATABASE_URL: "libsql://demo.example.com",
        DATABASE_AUTH_TOKEN: "test-token",
      }),
    ).rejects.toThrow("Remote libSQL is not enabled");
  });
});
