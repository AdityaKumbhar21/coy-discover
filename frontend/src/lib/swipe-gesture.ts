import type { Decision } from "../components/discover/types";

// A deliberate horizontal drag: 25% of the card, bounded for small/large screens.
// Velocity alone never submits, and vertical scrolling must not become a swipe.
export function swipeDecision(
  offsetX: number,
  offsetY: number,
  width: number,
): Decision | null {
  if (![offsetX, offsetY, width].every(Number.isFinite) || width <= 0)
    return null;
  const threshold = Math.max(64, Math.min(120, width * 0.25));
  if (
    Math.abs(offsetX) < threshold ||
    Math.abs(offsetX) <= Math.abs(offsetY) * 1.25
  )
    return null;
  return offsetX > 0 ? "like" : "pass";
}
