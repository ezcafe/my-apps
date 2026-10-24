CREATE TYPE "public"."food_meal_slot" AS ENUM('breakfast', 'lunch', 'dinner');--> statement-breakpoint
CREATE TYPE "public"."food_analysis_status" AS ENUM('ok', 'error');--> statement-breakpoint
CREATE TABLE "food_log_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"logged_on" text NOT NULL,
	"food_type" text NOT NULL,
	"meal_slot" "food_meal_slot",
	"note" text,
	"created_by_user_sub" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "food_analysis" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"suggestions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"window_start" text,
	"window_end" text,
	"entry_hash" text,
	"status" "food_analysis_status" DEFAULT 'ok' NOT NULL,
	"error_message" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "food_log_entry" ADD CONSTRAINT "food_log_entry_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_analysis" ADD CONSTRAINT "food_analysis_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "food_log_entry_workspace_logged_on_idx" ON "food_log_entry" USING btree ("workspace_id","logged_on");--> statement-breakpoint
CREATE UNIQUE INDEX "food_analysis_workspace_uq" ON "food_analysis" USING btree ("workspace_id");--> statement-breakpoint
ALTER TABLE "food_log_entry" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "food_analysis" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "food_log_entry" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "food_analysis" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY food_log_entry_workspace_rls ON food_log_entry
  USING (workspace_id = app_current_workspace_id())
  WITH CHECK (workspace_id = app_current_workspace_id());--> statement-breakpoint
CREATE POLICY food_analysis_workspace_rls ON food_analysis
  USING (workspace_id = app_current_workspace_id())
  WITH CHECK (workspace_id = app_current_workspace_id());
