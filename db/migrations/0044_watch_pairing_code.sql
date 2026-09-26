CREATE TABLE "watch_pairing_code" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_sub" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "watch_pairing_code" ADD CONSTRAINT "watch_pairing_code_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "watch_pairing_code_hash_uq" ON "watch_pairing_code" USING btree ("code_hash");
--> statement-breakpoint
CREATE INDEX "watch_pairing_code_user_idx" ON "watch_pairing_code" USING btree ("user_sub");
