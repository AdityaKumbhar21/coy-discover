import { z } from "zod";
import type { Decision, Match, Profile } from "../../components/discover/types";

const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const decision = z.enum(["like", "pass"]);
const profile = z.strictObject({
  id,
  name: z.string().trim().min(1).max(80),
  age: z.number().int().min(18).max(99),
  photoUrl: z.union([
    z.literal("/images/profile-placeholder.svg"),
    z.url({ protocol: /^https$/ }),
  ]),
  bio: z.string().trim().min(1).max(280),
  cityOrCollege: z.string().trim().min(1).max(120),
  interests: z.array(z.string().trim().min(1).max(40)).min(1).max(10),
}) satisfies z.ZodType<Profile>;
const match = z.strictObject({
  id,
  profile,
  createdAt: z.iso.datetime(),
}) satisfies z.ZodType<Match>;
const swipeInput = z.strictObject({ profileId: id, decision });
const swipeResult = z.discriminatedUnion("matchCreated", [
  z.strictObject({ swipe: swipeInput, matchCreated: z.literal(true), match }),
  z.strictObject({
    swipe: swipeInput,
    matchCreated: z.literal(false),
    match: match.nullable(),
  }),
]);

const messages = {
  INVALID_REQUEST: "This action could not be saved. Please try again.",
  UNSUPPORTED_MEDIA_TYPE: "This action could not be saved. Please try again.",
  PAYLOAD_TOO_LARGE: "This action could not be saved. Please try again.",
  PROFILE_NOT_FOUND: "This profile is no longer available. Updating your feed.",
  SELF_SWIPE: "This profile is unavailable. Please refresh your feed.",
  SWIPE_CONFLICT: "This profile was already swiped on. Updating your feed.",
  NOT_FOUND: "The service is unavailable. Please try again.",
  METHOD_NOT_ALLOWED: "The service is unavailable. Please try again.",
  TEMPORARILY_UNAVAILABLE: "The service is busy. Please try again.",
  INTERNAL_ERROR: "Something went wrong. Please try again.",
  NETWORK_ERROR:
    "Could not reach the service. Check your connection and try again.",
  INVALID_RESPONSE:
    "The service returned an unexpected response. Please try again.",
} as const;
export type ApiErrorCode = keyof typeof messages;
const errorBody = z.strictObject({
  error: z.strictObject({
    code: z.enum([
      "INVALID_REQUEST",
      "UNSUPPORTED_MEDIA_TYPE",
      "PAYLOAD_TOO_LARGE",
      "PROFILE_NOT_FOUND",
      "SELF_SWIPE",
      "SWIPE_CONFLICT",
      "NOT_FOUND",
      "METHOD_NOT_ALLOWED",
      "TEMPORARILY_UNAVAILABLE",
      "INTERNAL_ERROR",
    ]),
    message: z.string(),
  }),
});

export class ApiError extends Error {
  constructor(public readonly code: ApiErrorCode) {
    super(messages[code]);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      cache: "no-store",
      ...(signal ? { signal } : {}),
      ...(body === undefined
        ? {}
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    });
  } catch (error: unknown) {
    if (signal?.aborted) throw error;
    throw new ApiError("NETWORK_ERROR");
  }
  let value: unknown;
  try {
    value = await response.json();
  } catch (error: unknown) {
    if (signal?.aborted) throw error;
    throw new ApiError(response.ok ? "INVALID_RESPONSE" : "NETWORK_ERROR");
  }
  if (!response.ok) {
    const parsed = errorBody.safeParse(value);
    throw new ApiError(
      parsed.success ? parsed.data.error.code : "INVALID_RESPONSE",
    );
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new ApiError("INVALID_RESPONSE");
  return parsed.data;
}

export async function getFeed(signal?: AbortSignal): Promise<Profile[]> {
  return (
    await request(
      "/feed",
      z.strictObject({ profiles: z.array(profile) }),
      signal,
    )
  ).profiles;
}
export async function getMatches(signal?: AbortSignal): Promise<Match[]> {
  return (
    await request(
      "/matches",
      z.strictObject({ matches: z.array(match) }),
      signal,
    )
  ).matches;
}
export type SwipeInput = { profileId: number; decision: Decision };
export type SwipeResult = z.infer<typeof swipeResult>;
export async function sendSwipe(input: SwipeInput): Promise<SwipeResult> {
  if (!swipeInput.safeParse(input).success)
    throw new ApiError("INVALID_REQUEST");
  const result = await request("/swipe", swipeResult, undefined, input);
  if (
    result.swipe.profileId !== input.profileId ||
    result.swipe.decision !== input.decision ||
    (result.match && result.match.profile.id !== input.profileId) ||
    (input.decision === "pass" && result.match)
  ) {
    throw new ApiError("INVALID_RESPONSE");
  }
  return result;
}
