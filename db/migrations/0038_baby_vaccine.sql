CREATE TYPE "public"."baby_vaccine_dose" AS ENUM('first', 'second');--> statement-breakpoint
CREATE TABLE "baby_vaccine_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"baby_id" uuid NOT NULL,
	"name" text NOT NULL,
	"dose" "baby_vaccine_dose" NOT NULL,
	"administered_at" timestamp with time zone NOT NULL,
	"notes" text,
	"source" "baby_care_event_source" DEFAULT 'web' NOT NULL,
	"created_by_user_sub" text NOT NULL,
	"updated_by_user_sub" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "baby_vaccine_entry" ADD CONSTRAINT "baby_vaccine_entry_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_vaccine_entry" ADD CONSTRAINT "baby_vaccine_entry_baby_id_baby_profile_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."baby_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "baby_vaccine_entry_workspace_administered_idx" ON "baby_vaccine_entry" USING btree ("workspace_id","administered_at");--> statement-breakpoint
CREATE INDEX "baby_vaccine_entry_baby_administered_idx" ON "baby_vaccine_entry" USING btree ("baby_id","administered_at");--> statement-breakpoint
ALTER TABLE "baby_vaccine_entry" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "baby_vaccine_entry" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY baby_vaccine_entry_workspace_rls ON baby_vaccine_entry
  USING (workspace_id = app_current_workspace_id())
  WITH CHECK (workspace_id = app_current_workspace_id());
