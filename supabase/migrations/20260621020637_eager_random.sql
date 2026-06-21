ALTER TABLE "connections" ADD COLUMN "bootstrap_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "bootstrap_verified_at" timestamp with time zone;