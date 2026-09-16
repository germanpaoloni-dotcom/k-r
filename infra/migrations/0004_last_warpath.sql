DO $$ BEGIN
 CREATE TYPE "public"."promotion_status" AS ENUM('pending_payment', 'active', 'ended', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"target_type" varchar(20) NOT NULL,
	"target_id" uuid NOT NULL,
	"status" "promotion_status" DEFAULT 'pending_payment' NOT NULL,
	"budget_cents" integer NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "promotions" ADD CONSTRAINT "promotions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "promotions_business_idx" ON "promotions" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "promotions_active_idx" ON "promotions" USING btree ("status","ends_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_buyer_idx" ON "orders" USING btree ("buyer_user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_business_idx" ON "orders" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payments_order_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payouts_business_idx" ON "payouts" USING btree ("business_id","scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payouts_status_idx" ON "payouts" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recommendations_user_target_idx" ON "recommendations" USING btree ("user_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recommendations_target_idx" ON "recommendations" USING btree ("target_type","target_id");