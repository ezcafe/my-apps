CREATE TYPE "public"."workspace_kind" AS ENUM('personal', 'shared');--> statement-breakpoint
CREATE TYPE "public"."workspace_member_role" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TYPE "public"."money_account_type" AS ENUM('checking', 'savings', 'credit', 'cash', 'investment', 'other');--> statement-breakpoint
CREATE TYPE "public"."money_cadence" AS ENUM('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."money_transaction_kind" AS ENUM('expense', 'income', 'transfer');--> statement-breakpoint
CREATE TABLE "user_workspace_default" (
	"user_sub" text NOT NULL,
	"app_key" text NOT NULL,
	"default_workspace_id" uuid,
	CONSTRAINT "user_workspace_default_user_sub_app_key_pk" PRIMARY KEY("user_sub","app_key")
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" "workspace_kind" NOT NULL,
	"owned_by_user_sub" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_kind_owned_ck" CHECK (("workspace"."kind" = 'personal' AND "workspace"."owned_by_user_sub" IS NOT NULL) OR ("workspace"."kind" = 'shared' AND "workspace"."owned_by_user_sub" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "workspace_member" (
	"workspace_id" uuid NOT NULL,
	"user_sub" text NOT NULL,
	"role" "workspace_member_role" DEFAULT 'member' NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_member_workspace_id_user_sub_pk" PRIMARY KEY("workspace_id","user_sub")
);
--> statement-breakpoint
CREATE TABLE "money_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "money_account_type" DEFAULT 'checking' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"institution" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "money_budget" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"category_id" uuid,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"limit_amount_minor" bigint NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "money_category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"parent_id" uuid,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "money_merchant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "money_recurrent_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"cadence" "money_cadence" DEFAULT 'monthly' NOT NULL,
	"next_run_at" timestamp with time zone NOT NULL,
	"template" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "money_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"match" jsonb NOT NULL,
	"action" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "money_tag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "money_transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"kind" "money_transaction_kind" DEFAULT 'expense' NOT NULL,
	"amount_minor" bigint NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"category_id" uuid,
	"merchant_id" uuid,
	"notes" text,
	"created_by_sub" text NOT NULL,
	"transfer_pair_id" uuid,
	"recurrence_source_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "money_transaction_tag" (
	"transaction_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "money_transaction_tag_transaction_id_tag_id_pk" PRIMARY KEY("transaction_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "user_workspace_default" ADD CONSTRAINT "user_workspace_default_default_workspace_id_workspace_id_fk" FOREIGN KEY ("default_workspace_id") REFERENCES "public"."workspace"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_account" ADD CONSTRAINT "money_account_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_budget" ADD CONSTRAINT "money_budget_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_budget" ADD CONSTRAINT "money_budget_category_id_money_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."money_category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_category" ADD CONSTRAINT "money_category_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_merchant" ADD CONSTRAINT "money_merchant_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_recurrent_template" ADD CONSTRAINT "money_recurrent_template_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_rule" ADD CONSTRAINT "money_rule_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_tag" ADD CONSTRAINT "money_tag_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_transaction" ADD CONSTRAINT "money_transaction_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_transaction" ADD CONSTRAINT "money_transaction_account_id_money_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."money_account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_transaction" ADD CONSTRAINT "money_transaction_category_id_money_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."money_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_transaction" ADD CONSTRAINT "money_transaction_merchant_id_money_merchant_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."money_merchant"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_transaction" ADD CONSTRAINT "money_transaction_recurrence_source_id_money_recurrent_template_id_fk" FOREIGN KEY ("recurrence_source_id") REFERENCES "public"."money_recurrent_template"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_transaction_tag" ADD CONSTRAINT "money_transaction_tag_transaction_id_money_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."money_transaction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_transaction_tag" ADD CONSTRAINT "money_transaction_tag_tag_id_money_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."money_tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_workspace_default_workspace_idx" ON "user_workspace_default" USING btree ("default_workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_owned_by_user_sub_uq" ON "workspace" USING btree ("owned_by_user_sub") WHERE "workspace"."owned_by_user_sub" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "workspace_member_user_idx" ON "workspace_member" USING btree ("user_sub");--> statement-breakpoint
CREATE INDEX "money_account_workspace_idx" ON "money_account" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "money_budget_workspace_idx" ON "money_budget" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "money_category_workspace_idx" ON "money_category" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "money_category_parent_idx" ON "money_category" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "money_merchant_workspace_idx" ON "money_merchant" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "money_recurrent_workspace_idx" ON "money_recurrent_template" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "money_rule_workspace_idx" ON "money_rule" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "money_rule_priority_idx" ON "money_rule" USING btree ("workspace_id","priority");--> statement-breakpoint
CREATE INDEX "money_tag_workspace_idx" ON "money_tag" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "money_tag_workspace_name_uq" ON "money_tag" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "money_tx_workspace_occurred_idx" ON "money_transaction" USING btree ("workspace_id","occurred_at");--> statement-breakpoint
CREATE INDEX "money_tx_account_idx" ON "money_transaction" USING btree ("account_id");