import { and, asc, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import type { Database } from "./connection.js";
import type { Decision } from "../contracts/discover.js";
import { matches, profiles, swipes } from "./schema.js";

type Executor = Pick<Database, "select" | "insert">;

// Explicit public projection. Relationship state never belongs in a profile DTO.
const profileFields = {
  id: profiles.id,
  name: profiles.name,
  age: profiles.age,
  photoUrl: profiles.photoUrl,
  bio: profiles.bio,
  cityOrCollege: profiles.cityOrCollege,
  interests: profiles.interests,
};

export async function profileExists(
  db: Executor,
  id: number,
): Promise<boolean> {
  return Boolean(
    await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, id))
      .get(),
  );
}

export function unswipedProfiles(db: Executor, actorId: number) {
  return db
    .select(profileFields)
    .from(profiles)
    .leftJoin(
      swipes,
      and(eq(swipes.actorId, actorId), eq(swipes.targetId, profiles.id)),
    )
    .where(and(ne(profiles.id, actorId), isNull(swipes.actorId)))
    .orderBy(asc(profiles.id));
}

export function findSwipe(db: Executor, actorId: number, targetId: number) {
  return db
    .select({ decision: swipes.decision })
    .from(swipes)
    .where(and(eq(swipes.actorId, actorId), eq(swipes.targetId, targetId)))
    .get();
}

export function insertSwipe(
  db: Executor,
  actorId: number,
  targetId: number,
  decision: Decision,
  createdAt: number,
) {
  return db.insert(swipes).values({ actorId, targetId, decision, createdAt });
}

export async function insertCanonicalMatch(
  db: Executor,
  actorId: number,
  targetId: number,
  createdAt: number,
) {
  const inserted = await db
    .insert(matches)
    .values({
      profileLowId: Math.min(actorId, targetId),
      profileHighId: Math.max(actorId, targetId),
      createdAt,
    })
    .onConflictDoNothing({
      target: [matches.profileLowId, matches.profileHighId],
    })
    .returning({ id: matches.id });
  return inserted.length === 1;
}

export function mutualMatches(
  db: Executor,
  actorId: number,
  targetId?: number,
) {
  const outgoing = alias(swipes, "outgoing_like");
  const incoming = alias(swipes, "incoming_like");
  return db
    .select({
      id: matches.id,
      createdAt: matches.createdAt,
      profile: profileFields,
    })
    .from(matches)
    .innerJoin(
      profiles,
      eq(
        profiles.id,
        sql<number>`CASE WHEN ${matches.profileLowId} = ${actorId} THEN ${matches.profileHighId} ELSE ${matches.profileLowId} END`,
      ),
    )
    .innerJoin(
      outgoing,
      and(
        eq(outgoing.actorId, actorId),
        eq(outgoing.targetId, profiles.id),
        eq(outgoing.decision, "like"),
      ),
    )
    .innerJoin(
      incoming,
      and(
        eq(incoming.actorId, profiles.id),
        eq(incoming.targetId, actorId),
        eq(incoming.decision, "like"),
      ),
    )
    .where(
      and(
        or(
          eq(matches.profileLowId, actorId),
          eq(matches.profileHighId, actorId),
        ),
        targetId === undefined ? undefined : eq(profiles.id, targetId),
      ),
    )
    .orderBy(desc(matches.createdAt), desc(matches.id));
}
