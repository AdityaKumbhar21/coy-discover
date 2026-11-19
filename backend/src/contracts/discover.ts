import { z } from "zod";

export const idSchema = z
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);
export const decisionSchema = z.enum(["like", "pass"]);
export const emptyQuerySchema = z.strictObject({});

export const profileSchema = z.strictObject({
  id: idSchema,
  name: z.string().trim().min(1).max(80),
  age: z.number().int().min(18).max(99),
  photoUrl: z.union([
    z.literal("/images/profile-placeholder.svg"),
    z.url({ protocol: /^https$/ }),
  ]),
  bio: z.string().trim().min(1).max(280),
  cityOrCollege: z.string().trim().min(1).max(120),
  interests: z.array(z.string().trim().min(1).max(40)).min(1).max(10),
});

export const matchSchema = z.strictObject({
  id: idSchema,
  profile: profileSchema,
  createdAt: z.iso.datetime(),
});

export const feedResponseSchema = z.strictObject({
  profiles: z.array(profileSchema),
});
export const matchesResponseSchema = z.strictObject({
  matches: z.array(matchSchema),
});
export const swipeRequestSchema = z.strictObject({
  profileId: idSchema,
  decision: decisionSchema,
});
const swipeResultFields = { swipe: swipeRequestSchema };
export const swipeResponseSchema = z.discriminatedUnion("matchCreated", [
  z.strictObject({
    ...swipeResultFields,
    matchCreated: z.literal(true),
    match: matchSchema,
  }),
  z.strictObject({
    ...swipeResultFields,
    matchCreated: z.literal(false),
    match: matchSchema.nullable(),
  }),
]);

export const errorCodeSchema = z.enum([
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
]);
export const errorResponseSchema = z.strictObject({
  error: z.strictObject({ code: errorCodeSchema, message: z.string() }),
});

export type Decision = z.infer<typeof decisionSchema>;
export type ProfileDto = z.infer<typeof profileSchema>;
export type MatchDto = z.infer<typeof matchSchema>;
export type SwipeRequest = z.infer<typeof swipeRequestSchema>;
export type SwipeResponse = z.infer<typeof swipeResponseSchema>;
export type FeedResponse = z.infer<typeof feedResponseSchema>;
export type MatchesResponse = z.infer<typeof matchesResponseSchema>;
export type ErrorCode = z.infer<typeof errorCodeSchema>;
