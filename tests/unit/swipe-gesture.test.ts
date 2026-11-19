import { describe, expect, it } from "vitest";
import { swipeDecision } from "../../frontend/src/lib/swipe-gesture";

describe("deliberate horizontal swipes", () => {
  it.each([
    [80, 5, 320, "like"],
    [-80, 5, 320, "pass"],
    [79, 0, 320, null],
    [-30, 0, 320, null],
    [120, 140, 320, null],
    [0, 200, 320, null],
    [64, 0, 200, "like"],
    [120, 0, 800, "like"],
    [100, 80, 320, null],
    [Number.NaN, 0, 320, null],
    [100, 0, 0, null],
  ] as const)("offset (%s, %s), width %s gives %s", (x, y, width, expected) => {
    expect(swipeDecision(x, y, width)).toBe(expected);
  });
});
