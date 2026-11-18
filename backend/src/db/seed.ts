import { z } from "zod";
import type { Database } from "./connection.js";
import { profiles, swipes } from "./schema.js";

const idSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const shortText = (max: number) => z.string().trim().min(1).max(max);
const profileSchema = z.strictObject({
  id: idSchema,
  name: shortText(80),
  age: z.number().int().min(18).max(99),
  photoUrl: z.union([
    z.literal("/images/profile-placeholder.svg"),
    z.url({ protocol: /^https$/ }),
  ]),
  bio: shortText(280),
  cityOrCollege: shortText(120),
  interests: z.array(shortText(40)).min(1).max(10),
});

const seedSchema = z
  .strictObject({
    demoUserId: idSchema,
    profiles: z.array(profileSchema).min(31),
    swipes: z
      .array(
        z.strictObject({
          actorId: idSchema,
          targetId: idSchema,
          decision: z.literal("like"),
          createdAt: z
            .number()
            .int()
            .nonnegative()
            .max(Number.MAX_SAFE_INTEGER),
        }),
      )
      .min(3),
  })
  .superRefine((data, context) => {
    const ids = new Set(data.profiles.map((profile) => profile.id));
    const directedPairs = new Set<string>();
    const invalidProfiles =
      ids.size !== data.profiles.length || !ids.has(data.demoUserId);
    const invalidSwipes = data.swipes.some((swipe) => {
      const key = `${swipe.actorId}:${swipe.targetId}`;
      const invalid =
        swipe.actorId === data.demoUserId ||
        swipe.targetId !== data.demoUserId ||
        !ids.has(swipe.actorId) ||
        directedPairs.has(key);
      directedPairs.add(key);
      return invalid;
    });
    if (invalidProfiles || invalidSwipes) {
      context.addIssue({ code: "custom", message: "Invalid demo seed graph." });
    }
  });

export type SeedData = z.infer<typeof seedSchema>;

export async function seedDatabase(
  db: Database,
  input: unknown,
): Promise<void> {
  // Validate the entire graph before opening a write transaction.
  const result = seedSchema.safeParse(input);
  if (!result.success) {
    throw new Error("Invalid seed data. No seed changes were applied.");
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(profiles)
      .values(result.data.profiles)
      .onConflictDoNothing({ target: profiles.id });
    await tx
      .insert(swipes)
      .values(result.data.swipes)
      .onConflictDoNothing({ target: [swipes.actorId, swipes.targetId] });
  });
}
