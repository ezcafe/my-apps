CREATE TABLE "apple_wallet_channel_state" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"latest_message" text DEFAULT '' NOT NULL,
	"latest_message_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apple_wallet_subscriber" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_sub" text NOT NULL,
	"serial_number" text NOT NULL,
	"auth_token" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "apple_wallet_subscriber_status_check" CHECK ("apple_wallet_subscriber"."status" in ('active', 'removed'))
);
--> statement-breakpoint
CREATE TABLE "apple_wallet_device" (
	"device_library_id" text PRIMARY KEY NOT NULL,
	"push_token" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apple_wallet_registration" (
	"device_library_id" text NOT NULL,
	"serial_number" text NOT NULL,
	"pass_type_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "apple_wallet_registration_pk" PRIMARY KEY("device_library_id","serial_number")
);
--> statement-breakpoint
CREATE TABLE "apple_wallet_issue_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_sub" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "apple_wallet_channel_state" ADD CONSTRAINT "apple_wallet_channel_state_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "apple_wallet_subscriber" ADD CONSTRAINT "apple_wallet_subscriber_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "apple_wallet_registration" ADD CONSTRAINT "apple_wallet_registration_device_fk" FOREIGN KEY ("device_library_id") REFERENCES "public"."apple_wallet_device"("device_library_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "apple_wallet_registration" ADD CONSTRAINT "apple_wallet_registration_serial_fk" FOREIGN KEY ("serial_number") REFERENCES "public"."apple_wallet_subscriber"("serial_number") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "apple_wallet_issue_token" ADD CONSTRAINT "apple_wallet_issue_token_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "apple_wallet_subscriber_ws_user_uq" ON "apple_wallet_subscriber" USING btree ("workspace_id","user_sub");
--> statement-breakpoint
CREATE UNIQUE INDEX "apple_wallet_subscriber_serial_uq" ON "apple_wallet_subscriber" USING btree ("serial_number");
--> statement-breakpoint
CREATE INDEX "apple_wallet_subscriber_ws_status_idx" ON "apple_wallet_subscriber" USING btree ("workspace_id","status");
--> statement-breakpoint
CREATE INDEX "apple_wallet_registration_serial_idx" ON "apple_wallet_registration" USING btree ("serial_number");
--> statement-breakpoint
CREATE UNIQUE INDEX "apple_wallet_issue_token_hash_uq" ON "apple_wallet_issue_token" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX "apple_wallet_issue_token_expires_idx" ON "apple_wallet_issue_token" USING btree ("expires_at");
