import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createDiscoverFixture } from "../helpers/discover";
import { swipes, matches } from "../../backend/src/db/schema";

describe("incoming-like privacy and scoped matches", () => {
  let fixture: Awaited<ReturnType<typeof createDiscoverFixture>>;
  beforeEach(async () => {
    fixture = await createDiscoverFixture();
  });
  afterEach(async () => {
    await fixture?.cleanup();
  });

  it("keeps feed content/order unchanged when incoming likes change", async () => {
    const before = await fixture.services.feed();
    await fixture.db.delete(swipes);
    await fixture.db
      .insert(swipes)
      .values({ actorId: 1030, targetId: 1, decision: "like", createdAt: 0 });
    expect(await fixture.services.feed()).toEqual(before);
    expect(await fixture.services.matches()).toEqual({ matches: [] });
  });

  it("gives identical pass outcomes regardless of incoming interest", async () => {
    const incoming = await fixture.services.swipe({
      profileId: 1001,
      decision: "pass",
    });
    const none = await fixture.services.swipe({
      profileId: 1002,
      decision: "pass",
    });
    expect(incoming).toEqual({
      ...none,
      swipe: { profileId: 1001, decision: "pass" },
    });
  });

  it("excludes unrelated and nonreciprocal stored matches defensively", async () => {
    await fixture.services.swipe({ profileId: 1001, decision: "like" });
    await fixture.db.insert(swipes).values([
      { actorId: 1004, targetId: 1005, decision: "like", createdAt: 0 },
      { actorId: 1005, targetId: 1004, decision: "like", createdAt: 0 },
    ]);
    await fixture.db.insert(matches).values([
      { profileLowId: 1, profileHighId: 1003, createdAt: 100 },
      { profileLowId: 1004, profileHighId: 1005, createdAt: 100 },
    ]);
    const result = await fixture.services.matches();
    expect(result.matches.map((match) => match.profile.id)).toEqual([1001]);
    expect(Object.keys(result.matches[0] ?? {}).sort()).toEqual(
      ["id", "profile", "createdAt"].sort(),
    );
    await fixture.db
      .update(swipes)
      .set({ decision: "pass" })
      .where(eq(swipes.actorId, 1001));
    expect(await fixture.services.matches()).toEqual({ matches: [] });
  });

  it("returns all mutual matches with deterministic newest-first ordering", async () => {
    await fixture.services.swipe({ profileId: 1001, decision: "like" });
    await fixture.services.swipe({ profileId: 1007, decision: "like" });
    await fixture.db.update(matches).set({ createdAt: 1000 });
    const result = await fixture.services.matches();
    expect(result.matches.map((match) => match.profile.id)).toEqual([
      1007, 1001,
    ]);
    expect(
      result.matches.every(
        (match) => match.createdAt === "1970-01-01T00:00:01.000Z",
      ),
    ).toBe(true);
  });
});
