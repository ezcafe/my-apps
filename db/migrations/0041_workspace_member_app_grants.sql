-- Per-member app grants + user directory for email → user_sub lookup.
CREATE TABLE "user_directory" (
	"user_sub" text PRIMARY KEY NOT NULL,
	"email_normalized" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "user_directory_email_normalized_uq" ON "user_directory" USING btree ("email_normalized");--> statement-breakpoint
CREATE TABLE "workspace_member_app" (
	"workspace_id" uuid NOT NULL,
	"user_sub" text NOT NULL,
	"app_key" text NOT NULL,
	CONSTRAINT "workspace_member_app_workspace_id_user_sub_app_key_pk" PRIMARY KEY("workspace_id","user_sub","app_key"),
	CONSTRAINT "workspace_member_app_key_ck" CHECK ("app_key" IN ('money', 'baby'))
);--> statement-breakpoint
CREATE INDEX "workspace_member_app_user_app_idx" ON "workspace_member_app" USING btree ("user_sub","app_key");--> statement-breakpoint
ALTER TABLE "workspace_member_app" ADD CONSTRAINT "workspace_member_app_member_fk" FOREIGN KEY ("workspace_id","user_sub") REFERENCES "public"."workspace_member"("workspace_id","user_sub") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Existing shared members keep Money + Baby access until owners tighten grants.
INSERT INTO "workspace_member_app" ("workspace_id", "user_sub", "app_key")
SELECT wm."workspace_id", wm."user_sub", v."app_key"
FROM "workspace_member" wm
INNER JOIN "workspace" w ON w."id" = wm."workspace_id"
CROSS JOIN (VALUES ('money'), ('baby')) AS v("app_key")
WHERE w."kind" = 'shared'
  AND wm."role" = 'member'
ON CONFLICT DO NOTHING;
