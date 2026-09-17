DO $$ BEGIN
 CREATE TYPE "public"."pet_cosmetic_slot" AS ENUM('hat', 'glasses', 'outfit');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pet_cosmetics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(40) NOT NULL,
	"name" varchar(60) NOT NULL,
	"slot" "pet_cosmetic_slot" NOT NULL,
	"emoji" varchar(8) NOT NULL,
	"rarity" "pet_rarity" DEFAULT 'common' NOT NULL,
	"credits_cost" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pet_cosmetics_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN "equipped_hat_id" uuid;--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN "equipped_glasses_id" uuid;--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN "equipped_outfit_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pets" ADD CONSTRAINT "pets_equipped_hat_id_pet_cosmetics_id_fk" FOREIGN KEY ("equipped_hat_id") REFERENCES "public"."pet_cosmetics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pets" ADD CONSTRAINT "pets_equipped_glasses_id_pet_cosmetics_id_fk" FOREIGN KEY ("equipped_glasses_id") REFERENCES "public"."pet_cosmetics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pets" ADD CONSTRAINT "pets_equipped_outfit_id_pet_cosmetics_id_fk" FOREIGN KEY ("equipped_outfit_id") REFERENCES "public"."pet_cosmetics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
