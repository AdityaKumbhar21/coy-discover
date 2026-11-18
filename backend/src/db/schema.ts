import { sql } from "drizzle-orm";
import {
  check,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// Schema metadata is shared with Drizzle Kit; runtime DB modules are server-only.
export const profiles = sqliteTable(
  "profiles",
  {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    age: integer("age").notNull(),
    photoUrl: text("photo_url").notNull(),
    bio: text("bio").notNull(),
    cityOrCollege: text("city_or_college").notNull(),
    interests: text("interests", { mode: "json" }).$type<string[]>().notNull(),
  },
  (table) => [
    check("profiles_id_valid", sql`${table.id} BETWEEN 1 AND 9007199254740991`),
    check("profiles_name_nonempty", sql`length(trim(${table.name})) > 0`),
    check(
      "profiles_age_valid",
      sql`typeof(${table.age}) = 'integer' AND ${table.age} BETWEEN 18 AND 99`,
    ),
    check("profiles_photo_nonempty", sql`length(trim(${table.photoUrl})) > 0`),
    check("profiles_bio_nonempty", sql`length(trim(${table.bio})) > 0`),
    check(
      "profiles_location_nonempty",
      sql`length(trim(${table.cityOrCollege})) > 0`,
    ),
    check(
      "profiles_interests_array",
      sql`CASE WHEN json_valid(${table.interests}) THEN json_type(${table.interests}) = 'array' AND json_array_length(${table.interests}) > 0 ELSE 0 END`,
    ),
  ],
);

export const swipes = sqliteTable(
  "swipes",
  {
    actorId: integer("actor_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    targetId: integer("target_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    decision: text("decision", { enum: ["like", "pass"] }).notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.actorId, table.targetId] }),
    check("swipes_not_self", sql`${table.actorId} <> ${table.targetId}`),
    check("swipes_decision_valid", sql`${table.decision} IN ('like', 'pass')`),
    check(
      "swipes_timestamp_valid",
      sql`typeof(${table.createdAt}) = 'integer' AND ${table.createdAt} BETWEEN 0 AND 9007199254740991`,
    ),
  ],
);

export const matches = sqliteTable(
  "matches",
  {
    id: integer("id").primaryKey(),
    profileLowId: integer("profile_low_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    profileHighId: integer("profile_high_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("matches_pair_unique").on(
      table.profileLowId,
      table.profileHighId,
    ),
    check("matches_id_valid", sql`${table.id} BETWEEN 1 AND 9007199254740991`),
    check(
      "matches_pair_canonical",
      sql`${table.profileLowId} < ${table.profileHighId}`,
    ),
    check(
      "matches_timestamp_valid",
      sql`typeof(${table.createdAt}) = 'integer' AND ${table.createdAt} BETWEEN 0 AND 9007199254740991`,
    ),
  ],
);
