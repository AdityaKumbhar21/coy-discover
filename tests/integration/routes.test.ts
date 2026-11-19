import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDiscoverFixture } from "../helpers/discover";
import {
  feedResponseSchema,
  matchesResponseSchema,
  swipeResponseSchema,
  errorResponseSchema,
} from "../../backend/src/contracts/discover";
import { createDiscoverServices } from "../../backend/src/services/discover";

describe("exact Express HTTP contracts", () => {
  let fixture: Awaited<ReturnType<typeof createDiscoverFixture>>;
  let base: string;
  beforeEach(async () => {
    fixture = await createDiscoverFixture();
    base = await fixture.startHttp();
  });
  afterEach(async () => {
    await fixture?.cleanup();
  });

  function post(body: unknown, path = "/swipe") {
    return fetch(base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function expectError(response: Response, status: number, code: string) {
    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const data = errorResponseSchema.parse(await response.json());
    expect(data.error.code).toBe(code);
    return data;
  }

  it("serves the uncached feed and empty matches without auth or private fields", async () => {
    const response = await fetch(base + "/feed", {
      headers: { "If-None-Match": '"fake"' },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("etag")).toBeNull();
    const feed = feedResponseSchema.parse(await response.json());
    expect(feed.profiles).toHaveLength(30);
    expect(feed.profiles.map((profile) => profile.id)).toEqual(
      Array.from({ length: 30 }, (_, index) => 1001 + index),
    );
    expect(Object.keys(feed.profiles[0] ?? {}).sort()).toEqual(
      [
        "id",
        "name",
        "age",
        "photoUrl",
        "bio",
        "cityOrCollege",
        "interests",
      ].sort(),
    );
    const matches = await fetch(base + "/matches");
    expect(matchesResponseSchema.parse(await matches.json())).toEqual({
      matches: [],
    });
  });

  it("returns one committed mutual match, does not celebrate retries, and preserves it through a new service instance", async () => {
    const input = { profileId: 1001, decision: "like" };
    const first = await post(input);
    expect(first.status).toBe(200);
    const result = swipeResponseSchema.parse(await first.json());
    expect(result.matchCreated).toBe(true);
    expect(result.match?.profile.id).toBe(1001);
    const retry = swipeResponseSchema.parse(await (await post(input)).json());
    expect(retry).toEqual({ ...result, matchCreated: false });
    const restarted = createDiscoverServices(fixture.configuration);
    expect(
      (await restarted.feed()).profiles.some((profile) => profile.id === 1001),
    ).toBe(false);
    expect(await restarted.matches()).toEqual({ matches: [result.match] });
  });

  it("records one-sided likes and passes without revealing incoming interest", async () => {
    for (const [profileId, decision] of [
      [1002, "like"],
      [1007, "pass"],
    ] as const) {
      const response = await post({ profileId, decision });
      expect(swipeResponseSchema.parse(await response.json())).toEqual({
        swipe: { profileId, decision },
        matchCreated: false,
        match: null,
      });
    }
    expect(await fixture.services.matches()).toEqual({ matches: [] });
    expect((await fixture.services.feed()).profiles).toHaveLength(28);
  });

  it("accepts same-decision retries and rejects a changed decision", async () => {
    const input = { profileId: 1002, decision: "pass" };
    const first = await (await post(input)).json();
    expect(await (await post(input)).json()).toEqual(first);
    await expectError(
      await post({ ...input, decision: "like" }),
      409,
      "SWIPE_CONFLICT",
    );
  });

  it.each([
    {},
    { profileId: 1002 },
    { profileId: "1002", decision: "like" },
    { profileId: -1, decision: "like" },
    { profileId: 1.5, decision: "like" },
    { profileId: 9007199254740992, decision: "like" },
    { profileId: 1002, decision: "maybe" },
    { profileId: 1002, decision: "like", actorId: 1001 },
    { profileId: 1002, decision: "like", matchCreated: true },
  ])("rejects invalid/untrusted request %j", async (input) => {
    await expectError(await post(input), 400, "INVALID_REQUEST");
    expect((await fixture.services.feed()).profiles).toHaveLength(30);
  });

  it("rejects unexpected query parameters on every endpoint", async () => {
    await expectError(
      await fetch(base + "/feed?actorId=1001"),
      400,
      "INVALID_REQUEST",
    );
    await expectError(
      await fetch(base + "/matches?incoming=true"),
      400,
      "INVALID_REQUEST",
    );
    await expectError(
      await post({ profileId: 1002, decision: "like" }, "/swipe?x=1"),
      400,
      "INVALID_REQUEST",
    );
  });

  it("returns safe errors for wrong media type, malformed/empty JSON, and oversized input", async () => {
    await expectError(
      await fetch(base + "/swipe", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "private input",
      }),
      415,
      "UNSUPPORTED_MEDIA_TYPE",
    );
    for (const body of ["{", ""]) {
      await expectError(
        await fetch(base + "/swipe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        }),
        400,
        "INVALID_REQUEST",
      );
    }
    await expectError(
      await post({ secret: "x".repeat(5000) }),
      413,
      "PAYLOAD_TOO_LARGE",
    );
  });

  it("rejects self and nonexistent targets without mutations", async () => {
    await expectError(
      await post({ profileId: 1, decision: "like" }),
      400,
      "SELF_SWIPE",
    );
    await expectError(
      await post({ profileId: 9999, decision: "like" }),
      404,
      "PROFILE_NOT_FOUND",
    );
    expect((await fixture.services.feed()).profiles).toHaveLength(30);
  });

  it("enforces exact paths and methods with Allow headers", async () => {
    for (const path of ["/api/feed", "/Feed", "/feed/"])
      await expectError(await fetch(base + path), 404, "NOT_FOUND");
    const response = await fetch(base + "/feed", { method: "POST" });
    await expectError(response, 405, "METHOD_NOT_ALLOWED");
    expect(response.headers.get("allow")).toBe("GET");
    const head = await fetch(base + "/matches", { method: "HEAD" });
    expect(head.status).toBe(405);
    expect(head.headers.get("allow")).toBe("GET");
  });

  it("does not leak exception details into 500 responses", async () => {
    const failing = await fixture.startHttp({
      ...fixture.services,
      async feed() {
        throw new Error("incomingLikes=private; SQL secret");
      },
    });
    const response = await fetch(failing + "/feed");
    const body = await expectError(response, 500, "INTERNAL_ERROR");
    expect(JSON.stringify(body)).not.toMatch(
      /incomingLikes|private|SQL|secret/,
    );
  });

  it("returns a safe retryable 503 when the database file cannot be opened", async () => {
    const unavailable = createDiscoverServices({
      DATABASE_URL: fixture.configuration.DATABASE_URL + "/missing.sqlite",
    });
    const address = await fixture.startHttp(unavailable);
    const body = await expectError(
      await fetch(address + "/feed"),
      503,
      "TEMPORARILY_UNAVAILABLE",
    );
    expect(JSON.stringify(body)).not.toMatch(/sqlite|coy-test|SQLITE_CANTOPEN/);
  });
});
