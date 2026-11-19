import { parseEnvironment } from "../config/env.js";
import type {
  FeedResponse,
  MatchDto,
  MatchesResponse,
  SwipeRequest,
  SwipeResponse,
} from "../contracts/discover.js";
import {
  feedResponseSchema,
  matchesResponseSchema,
  swipeResponseSchema,
} from "../contracts/discover.js";
import { AppError } from "../errors.js";
import { runDatabaseOperation } from "../db/operations.js";
import {
  findSwipe,
  insertCanonicalMatch,
  insertSwipe,
  mutualMatches,
  profileExists,
  unswipedProfiles,
} from "../db/discover.js";
import { isMutualLike } from "./matching.js";

type StoredMatch = Awaited<ReturnType<typeof mutualMatches>>[number];
function toMatchDto(row: StoredMatch): MatchDto {
  return {
    id: row.id,
    profile: row.profile,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

export function createDiscoverServices(configuration: unknown) {
  const actorId = parseEnvironment(configuration).DEMO_USER_ID;

  return {
    async feed(): Promise<FeedResponse> {
      return runDatabaseOperation(configuration, async (db) => {
        if (!(await profileExists(db, actorId)))
          throw new AppError("INTERNAL_ERROR");
        return feedResponseSchema.parse({
          profiles: await unswipedProfiles(db, actorId),
        });
      });
    },

    async matches(): Promise<MatchesResponse> {
      return runDatabaseOperation(configuration, async (db) => {
        if (!(await profileExists(db, actorId)))
          throw new AppError("INTERNAL_ERROR");
        const rows = await mutualMatches(db, actorId);
        return matchesResponseSchema.parse({ matches: rows.map(toMatchDto) });
      });
    },

    async swipe(input: SwipeRequest): Promise<SwipeResponse> {
      return runDatabaseOperation(configuration, (db) =>
        db.transaction(async (tx) => {
          if (!(await profileExists(tx, actorId)))
            throw new AppError("INTERNAL_ERROR");
          if (input.profileId === actorId) throw new AppError("SELF_SWIPE");
          if (!(await profileExists(tx, input.profileId)))
            throw new AppError("PROFILE_NOT_FOUND");

          const existing = await findSwipe(tx, actorId, input.profileId);
          if (existing && existing.decision !== input.decision)
            throw new AppError("SWIPE_CONFLICT");

          let matchCreated = false;
          if (!existing) {
            const createdAt = Date.now();
            await insertSwipe(
              tx,
              actorId,
              input.profileId,
              input.decision,
              createdAt,
            );
            const reverse = await findSwipe(tx, input.profileId, actorId);
            if (isMutualLike(input.decision, reverse?.decision)) {
              matchCreated = await insertCanonicalMatch(
                tx,
                actorId,
                input.profileId,
                createdAt,
              );
            }
          }

          const rows =
            input.decision === "like"
              ? await mutualMatches(tx, actorId, input.profileId)
              : [];
          const match = rows[0] ? toMatchDto(rows[0]) : null;
          // Validate before commit; invalid stored data must roll back the write too.
          return swipeResponseSchema.parse({
            swipe: input,
            matchCreated,
            match,
          });
        }),
      );
    },
  };
}

export type DiscoverServices = ReturnType<typeof createDiscoverServices>;
