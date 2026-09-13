CREATE TABLE "baby_quick_care_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"baby_id" uuid NOT NULL,
	"request_id" text NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "baby_quick_care_request" ADD CONSTRAINT "baby_quick_care_request_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_quick_care_request" ADD CONSTRAINT "baby_quick_care_request_baby_id_baby_profile_id_fk" FOREIGN KEY ("baby_id") REFERENCES "public"."baby_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "baby_quick_care_request_uq" ON "baby_quick_care_request" USING btree ("workspace_id","request_id");--> statement-breakpoint
CREATE INDEX "baby_quick_care_request_created_idx" ON "baby_quick_care_request" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "baby_quick_care_request" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "baby_quick_care_request" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY baby_quick_care_request_workspace_rls ON baby_quick_care_request
  USING (workspace_id = app_current_workspace_id())
  WITH CHECK (workspace_id = app_current_workspace_id());
