CREATE TABLE `matches` (
	`id` integer PRIMARY KEY NOT NULL,
	`profile_low_id` integer NOT NULL,
	`profile_high_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`profile_low_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`profile_high_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "matches_id_valid" CHECK("matches"."id" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "matches_pair_canonical" CHECK("matches"."profile_low_id" < "matches"."profile_high_id"),
	CONSTRAINT "matches_timestamp_valid" CHECK(typeof("matches"."created_at") = 'integer' AND "matches"."created_at" BETWEEN 0 AND 9007199254740991)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `matches_pair_unique` ON `matches` (`profile_low_id`,`profile_high_id`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`age` integer NOT NULL,
	`photo_url` text NOT NULL,
	`bio` text NOT NULL,
	`city_or_college` text NOT NULL,
	`interests` text NOT NULL,
	CONSTRAINT "profiles_id_valid" CHECK("profiles"."id" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "profiles_name_nonempty" CHECK(length(trim("profiles"."name")) > 0),
	CONSTRAINT "profiles_age_valid" CHECK(typeof("profiles"."age") = 'integer' AND "profiles"."age" BETWEEN 18 AND 99),
	CONSTRAINT "profiles_photo_nonempty" CHECK(length(trim("profiles"."photo_url")) > 0),
	CONSTRAINT "profiles_bio_nonempty" CHECK(length(trim("profiles"."bio")) > 0),
	CONSTRAINT "profiles_location_nonempty" CHECK(length(trim("profiles"."city_or_college")) > 0),
	CONSTRAINT "profiles_interests_array" CHECK(CASE WHEN json_valid("profiles"."interests") THEN json_type("profiles"."interests") = 'array' AND json_array_length("profiles"."interests") > 0 ELSE 0 END)
);
--> statement-breakpoint
CREATE TABLE `swipes` (
	`actor_id` integer NOT NULL,
	`target_id` integer NOT NULL,
	`decision` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`actor_id`, `target_id`),
	FOREIGN KEY (`actor_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`target_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "swipes_not_self" CHECK("swipes"."actor_id" <> "swipes"."target_id"),
	CONSTRAINT "swipes_decision_valid" CHECK("swipes"."decision" IN ('like', 'pass')),
	CONSTRAINT "swipes_timestamp_valid" CHECK(typeof("swipes"."created_at") = 'integer' AND "swipes"."created_at" BETWEEN 0 AND 9007199254740991)
);
