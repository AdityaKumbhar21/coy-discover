import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  getFeed,
  sendSwipe,
} from "../../frontend/src/lib/api/discover";

const profile = {
  id: 1001,
  name: "Example",
  age: 24,
  photoUrl: "/images/profile-placeholder.svg",
  bio: "A short bio",
  cityOrCollege: "Pune",
  interests: ["Books"],
};
afterEach(() => vi.unstubAllGlobals());

describe("browser API boundary", () => {
  it("fetches and validates the same-origin feed without caching", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ profiles: [profile] }));
    vi.stubGlobal("fetch", fetcher);
    expect(await getFeed()).toEqual([profile]);
    expect(fetcher).toHaveBeenCalledWith("/feed", {
      method: "GET",
      cache: "no-store",
    });
  });

  it("accepts genuine feed exhaustion", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ profiles: [] })),
    );
    expect(await getFeed()).toEqual([]);
  });

  it("rejects unexpected private fields instead of delivering them to the UI", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ profiles: [{ ...profile, likedYou: true }] }),
        ),
    );
    await expect(getFeed()).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("sends only the target and decision and accepts the server's result", async () => {
    const input = { profileId: 1001, decision: "pass" } as const;
    const result = { swipe: input, matchCreated: false, match: null };
    const fetcher = vi.fn().mockResolvedValue(Response.json(result));
    vi.stubGlobal("fetch", fetcher);
    expect(await sendSwipe(input)).toEqual(result);
    expect(fetcher).toHaveBeenCalledWith("/swipe", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  });

  it("rejects a mismatched echoed decision", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          swipe: { profileId: 1001, decision: "like" },
          matchCreated: false,
          match: null,
        }),
      ),
    );
    await expect(
      sendSwipe({ profileId: 1001, decision: "pass" }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("never displays untrusted server exception text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: {
              code: "TEMPORARILY_UNAVAILABLE",
              message: "private incomingLikes SQL secret",
            },
          },
          { status: 503 },
        ),
      ),
    );
    await expect(getFeed()).rejects.toEqual(
      new ApiError("TEMPORARILY_UNAVAILABLE"),
    );
  });

  it("handles non-JSON proxy errors without exposing HTML", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("<html>private stack trace</html>", { status: 502 }),
        ),
    );
    await expect(getFeed()).rejects.toEqual(new ApiError("NETWORK_ERROR"));
  });
});
