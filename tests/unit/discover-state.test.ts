import { describe, expect, it } from "vitest";
import {
  discoverReducer,
  initialDiscoverState,
} from "../../frontend/src/lib/discover-state";
import type { DiscoverState } from "../../frontend/src/lib/discover-state";
import type { SwipeResult } from "../../frontend/src/lib/api/discover";

const one = {
  id: 1001,
  name: "Example",
  age: 24,
  photoUrl: "/images/profile-placeholder.svg",
  bio: "A bio",
  cityOrCollege: "Pune",
  interests: ["Books"],
};
const two = { ...one, id: 1002 };
const input = { profileId: one.id, decision: "like" } as const;
function ready(): DiscoverState {
  return {
    ...initialDiscoverState,
    feed: { status: "ready", items: [one, two], error: null, requestId: 1 },
  };
}

describe("Discover request and save state", () => {
  it("retains the current card and identical retry input after a failed save", () => {
    let state = discoverReducer(ready(), { type: "swipe/start", input });
    state = discoverReducer(state, {
      type: "swipe/error",
      input,
      message: "Try again",
    });
    expect(state.feed.items).toEqual([one, two]);
    expect(state.failedSwipe).toEqual(input);
    expect(state.pending).toBeNull();
  });

  it("excludes a committed swipe even when a late feed still contains it", () => {
    let state = discoverReducer(ready(), {
      type: "swipe/success",
      result: { swipe: input, matchCreated: false, match: null },
    });
    state = discoverReducer(state, { type: "feed/start", requestId: 2 });
    state = discoverReducer(state, {
      type: "feed/success",
      requestId: 2,
      items: [one, two],
    });
    expect(state.feed.items).toEqual([two]);
  });

  it("ignores results from superseded requests", () => {
    const state = discoverReducer(ready(), {
      type: "feed/start",
      requestId: 3,
    });
    expect(
      discoverReducer(state, { type: "feed/success", requestId: 2, items: [] }),
    ).toBe(state);
  });

  it("keeps pending content usable after a concurrent background refresh fails", () => {
    let state = discoverReducer(ready(), { type: "feed/start", requestId: 2 });
    state = discoverReducer(state, { type: "swipe/start", input });
    state = discoverReducer(state, {
      type: "feed/error",
      requestId: 2,
      message: "Offline",
    });
    expect(state.feed.status).toBe("ready");
    expect(state.feed.items).toEqual([one, two]);
  });

  it("does not dismiss the pending card because a background read observes the committed swipe first", () => {
    const state = discoverReducer(ready(), { type: "swipe/start", input });
    expect(
      discoverReducer(state, {
        type: "feed/success",
        requestId: 1,
        items: [two],
      }).feed.items,
    ).toEqual([one, two]);
  });

  it.each([true, false])(
    "shows the match dialog only for a newly created server match (%s)",
    (created) => {
      const match = {
        id: 1,
        profile: one,
        createdAt: "2026-01-01T00:00:00.000Z",
      };
      const result: SwipeResult = created
        ? { swipe: input, matchCreated: true, match }
        : { swipe: input, matchCreated: false, match };
      const state = discoverReducer(ready(), { type: "swipe/success", result });
      expect(state.newMatch).toEqual(created ? match : null);
      expect(state.matches.items).toEqual([match]);
    },
  );

  it("reconciles a lost response when the authoritative feed no longer includes the failed target", () => {
    const state = discoverReducer(ready(), {
      type: "swipe/error",
      input,
      message: "Network error",
    });
    const refreshed = discoverReducer(state, {
      type: "feed/success",
      requestId: 1,
      items: [two],
    });
    expect(refreshed.failedSwipe).toBeNull();
    expect(refreshed.swipeError).toBeNull();
  });
});
