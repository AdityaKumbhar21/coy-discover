import { describe, expect, it } from "vitest";
import { isMutualLike } from "../../backend/src/services/matching";
import {
  swipeResponseSchema,
  profileSchema,
} from "../../backend/src/contracts/discover";

describe("matching contract", () => {
  it.each([
    ["like", "like", true],
    ["like", "pass", false],
    ["like", undefined, false],
    ["pass", "like", false],
    ["pass", "pass", false],
    ["pass", undefined, false],
  ] as const)(
    "decision %s, reverse %s => mutual %s",
    (decision, reverse, expected) => {
      expect(isMutualLike(decision, reverse)).toBe(expected);
    },
  );

  it("rejects a created-match response without an actual match", () => {
    expect(
      swipeResponseSchema.safeParse({
        swipe: { profileId: 1001, decision: "like" },
        matchCreated: true,
        match: null,
      }).success,
    ).toBe(false);
  });

  it("rejects incoming-like fields in a public profile", () => {
    expect(
      profileSchema.safeParse({
        id: 1001,
        name: "Test",
        age: 24,
        photoUrl: "/images/profile-placeholder.svg",
        bio: "A bio",
        cityOrCollege: "Pune",
        interests: ["Books"],
        likedYou: true,
      }).success,
    ).toBe(false);
  });
});
