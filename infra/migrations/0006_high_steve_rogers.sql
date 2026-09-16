DO $$ BEGIN
 CREATE TYPE "public"."pet_rarity" AS ENUM('common', 'rare', 'epic', 'legendary');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pet_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(40) NOT NULL,
	"name" varchar(40) NOT NULL,
	"species" varchar(20) NOT NULL,
	"personality" varchar(80) NOT NULL,
	"description" text,
	"interaction" varchar(30) NOT NULL,
	"rarity" "pet_rarity" DEFAULT 'common' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pet_definitions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN "definition_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pets" ADD CONSTRAINT "pets_definition_id_pet_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."pet_definitions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
