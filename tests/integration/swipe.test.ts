import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createDiscoverFixture } from "../helpers/discover";
import { profiles, swipes, matches } from "../../backend/src/db/schema";

describe("atomic swipe service", () => {
  let fixture: Awaited<ReturnType<typeof createDiscoverFixture>>;
  beforeEach(async () => {
    fixture = await createDiscoverFixture();
  });
  afterEach(async () => {
    await fixture?.cleanup();
  });

  it.each(["BEFORE", "AFTER"])(
    "rolls back the swipe and match on a %s match-insert failure",
    async (timing) => {
      await fixture.client.execute(
        `CREATE TRIGGER fail_match ${timing} INSERT ON matches BEGIN SELECT RAISE(ABORT, 'injected failure'); END`,
      );
      await expect(
        fixture.services.swipe({ profileId: 1001, decision: "like" }),
      ).rejects.toThrow();
      expect(await fixture.db.select().from(matches)).toEqual([]);
      expect(
        await fixture.db.select().from(swipes).where(eq(swipes.actorId, 1)),
      ).toEqual([]);
      expect((await fixture.services.feed()).profiles).toHaveLength(30);
    },
  );

  it("rolls back writes if public response validation fails before commit", async () => {
    await fixture.db
      .update(profiles)
      .set({ bio: "x".repeat(281) })
      .where(eq(profiles.id, 1001));
    await expect(
      fixture.services.swipe({ profileId: 1001, decision: "like" }),
    ).rejects.toThrow();
    expect(await fixture.db.select().from(matches)).toEqual([]);
    expect(
      await fixture.db.select().from(swipes).where(eq(swipes.actorId, 1)),
    ).toEqual([]);
  });

  it("fails safely for a missing configured demo profile", async () => {
    await expect(fixture.forActor(9999).feed()).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
    });
    await expect(
      fixture.forActor(9999).swipe({ profileId: 1001, decision: "like" }),
    ).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
  });

  it("returns an empty feed after every candidate has been passed", async () => {
    for (const profile of (await fixture.services.feed()).profiles) {
      await fixture.services.swipe({ profileId: profile.id, decision: "pass" });
    }
    expect(await fixture.services.feed()).toEqual({ profiles: [] });
    expect(await fixture.services.matches()).toEqual({ matches: [] });
  });
});
