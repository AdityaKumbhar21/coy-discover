import { setTimeout as delay } from "node:timers/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createDiscoverFixture } from "../helpers/discover";
import { swipes, matches } from "../../backend/src/db/schema";

describe("independent-connection swipe contention", () => {
  let fixture: Awaited<ReturnType<typeof createDiscoverFixture>>;
  beforeEach(async () => {
    fixture = await createDiscoverFixture();
  });
  afterEach(async () => {
    await fixture?.cleanup();
  });

  it("creates only one swipe/match and one celebration for simultaneous identical likes", async () => {
    const input = { profileId: 1001, decision: "like" } as const;
    const results = await Promise.all([
      fixture.services.swipe(input),
      fixture.services.swipe(input),
    ]);
    expect(results.filter((result) => result.matchCreated)).toHaveLength(1);
    expect(results[0]?.match?.id).toBe(results[1]?.match?.id);
    expect(await fixture.db.select().from(matches)).toHaveLength(1);
    expect(
      await fixture.db.select().from(swipes).where(eq(swipes.actorId, 1)),
    ).toHaveLength(1);
  });

  it("has one winner and one conflict for simultaneous opposite decisions", async () => {
    const results = await Promise.allSettled([
      fixture.services.swipe({ profileId: 1001, decision: "like" }),
      fixture.services.swipe({ profileId: 1001, decision: "pass" }),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const conflict = results.find((result) => result.status === "rejected");
    expect(
      conflict?.status === "rejected" ? conflict.reason : undefined,
    ).toMatchObject({ code: "SWIPE_CONFLICT" });
    expect(
      await fixture.db.select().from(swipes).where(eq(swipes.actorId, 1)),
    ).toHaveLength(1);
  });

  it("creates one canonical match when both actors like concurrently", async () => {
    const results = await Promise.all([
      fixture.services.swipe({ profileId: 1002, decision: "like" }),
      fixture.forActor(1002).swipe({ profileId: 1, decision: "like" }),
    ]);
    expect(results.filter((result) => result.matchCreated)).toHaveLength(1);
    expect(await fixture.db.select().from(matches)).toHaveLength(1);
    expect((await fixture.services.matches()).matches[0]?.profile.id).toBe(
      1002,
    );
    expect(
      (await fixture.forActor(1002).matches()).matches[0]?.profile.id,
    ).toBe(1);
  });

  it("recovers with a fresh client after a transient lock", async () => {
    const held = await fixture.client.transaction("write");
    try {
      const pending = fixture.services.swipe({
        profileId: 1002,
        decision: "pass",
      });
      await delay(20);
      await held.commit();
      expect(await pending).toMatchObject({ matchCreated: false, match: null });
    } finally {
      held.close();
    }
  });

  it("bounds retries and reports unavailable without partial writes", async () => {
    const held = await fixture.client.transaction("write");
    try {
      await expect(
        fixture.services.swipe({ profileId: 1001, decision: "like" }),
      ).rejects.toMatchObject({ code: "TEMPORARILY_UNAVAILABLE" });
    } finally {
      held.close();
    }
    expect(await fixture.db.select().from(matches)).toEqual([]);
    expect(
      await fixture.db.select().from(swipes).where(eq(swipes.actorId, 1)),
    ).toEqual([]);
  });
});
