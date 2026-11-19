import type { Decision } from "../contracts/discover.js";

export function isMutualLike(
  decision: Decision,
  reverse: Decision | undefined,
): boolean {
  return decision === "like" && reverse === "like";
}
