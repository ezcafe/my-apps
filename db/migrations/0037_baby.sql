CREATE TYPE "public"."baby_care_event_type" AS ENUM('feed', 'diaper', 'sleep');--> statement-breakpoint
CREATE TYPE "public"."baby_care_event_source" AS ENUM('web', 'telegram');--> statement-breakpoint
CREATE TYPE "public"."baby_growth_kind" AS ENUM('weight', 'height', 'head', 'temperature', 'medication');--> statement-breakpoint
CREATE TABLE "baby_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"display_name" text DEFAULT 'Baby' NOT NULL,
	"birth_date" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "baby_care_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"baby_id" uuid NOT NULL,
	"type" "baby_care_event_type" NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source" "baby_care_event_source" DEFAULT 'web' NOT NULL,
	"created_by_user_sub" text NOT NULL,
	"updated_by_user_sub" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "baby_growth_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"baby_id" uuid NOT NULL,
	"kind" "baby_growth_kind" NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"value_num" numeric(12, 4),
	"value_text" text,
	"unit" text,
	"notes" text,
	"source" "baby_care_event_source" DEFAULT 'web' NOT NULL,
	"created_by_user_sub" text NOT NULL,
	"updated_by_user_sub" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "baby_telegram_link" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"linked_by_user_sub" text NOT NULL,
	"confirmed_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "baby_profile" ADD CONSTRAINT "baby_profile_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_care_event" ADD CONSTRAINT "baby_care_event_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_care_event" ADD CONSTRAINT "baby_care_event_baby_id_baby_profile_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."baby_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_growth_entry" ADD CONSTRAINT "baby_growth_entry_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_growth_entry" ADD CONSTRAINT "baby_growth_entry_baby_id_baby_profile_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."baby_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_telegram_link" ADD CONSTRAINT "baby_telegram_link_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "baby_profile_workspace_uq" ON "baby_profile" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "baby_care_event_workspace_occurred_idx" ON "baby_care_event" USING btree ("workspace_id","occurred_at");--> statement-breakpoint
CREATE INDEX "baby_care_event_baby_type_idx" ON "baby_care_event" USING btree ("baby_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "baby_care_event_open_sleep_uq" ON "baby_care_event" USING btree ("baby_id") WHERE "type" = 'sleep' AND "ended_at" IS NULL;--> statement-breakpoint
CREATE INDEX "baby_growth_entry_workspace_recorded_idx" ON "baby_growth_entry" USING btree ("workspace_id","recorded_at");--> statement-breakpoint
CREATE INDEX "baby_growth_entry_baby_kind_idx" ON "baby_growth_entry" USING btree ("baby_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "baby_telegram_link_chat_uq" ON "baby_telegram_link" USING btree ("chat_id");--> statement-breakpoint
ALTER TABLE "baby_profile" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "baby_care_event" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "baby_growth_entry" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "baby_telegram_link" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "baby_profile" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "baby_care_event" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "baby_growth_entry" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "baby_telegram_link" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY baby_profile_workspace_rls ON baby_profile
  USING (workspace_id = app_current_workspace_id())
  WITH CHECK (workspace_id = app_current_workspace_id());--> statement-breakpoint
CREATE POLICY baby_care_event_workspace_rls ON baby_care_event
  USING (workspace_id = app_current_workspace_id())
  WITH CHECK (workspace_id = app_current_workspace_id());--> statement-breakpoint
CREATE POLICY baby_growth_entry_workspace_rls ON baby_growth_entry
  USING (workspace_id = app_current_workspace_id())
  WITH CHECK (workspace_id = app_current_workspace_id());--> statement-breakpoint
CREATE POLICY baby_telegram_link_workspace_rls ON baby_telegram_link
  USING (workspace_id = app_current_workspace_id())
  WITH CHECK (workspace_id = app_current_workspace_id());
