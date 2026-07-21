CREATE TYPE "public"."savings_activity_type" AS ENUM('deposit', 'withdraw', 'interest');--> statement-breakpoint
CREATE TYPE "public"."investment_instrument_kind" AS ENUM('stocks', 'coins', 'fx');--> statement-breakpoint
CREATE TYPE "public"."investment_activity_type" AS ENUM('buy', 'sell', 'dividend', 'fee', 'adjustment', 'deposit', 'withdraw');--> statement-breakpoint
CREATE TABLE "savings_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "savings_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"activity_date" text NOT NULL,
	"type" "savings_activity_type" NOT NULL,
	"amount_minor" bigint NOT NULL,
	"notes" text,
	"money_account_id" uuid,
	"money_transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "investment_instrument" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"kind" "investment_instrument_kind" NOT NULL,
	"name" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"symbol" text NOT NULL,
	"yahoo_symbol" text,
	"archived" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "investment_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"activity_date" text NOT NULL,
	"type" "investment_activity_type" NOT NULL,
	"quantity" numeric(24, 8),
	"unit_price_minor" bigint,
	"amount_minor" bigint,
	"notes" text,
	"money_account_id" uuid,
	"money_transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "investment_quote" (
	"instrument_id" uuid PRIMARY KEY NOT NULL,
	"price_minor" bigint NOT NULL,
	"as_of" timestamp with time zone NOT NULL,
	"source" text DEFAULT 'yahoo' NOT NULL
);--> statement-breakpoint
CREATE TABLE "investment_quote_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instrument_id" uuid NOT NULL,
	"date" text NOT NULL,
	"close_price_minor" bigint NOT NULL
);--> statement-breakpoint
ALTER TABLE "savings_account" ADD CONSTRAINT "savings_account_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_activity" ADD CONSTRAINT "savings_activity_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_activity" ADD CONSTRAINT "savings_activity_account_id_savings_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."savings_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_instrument" ADD CONSTRAINT "investment_instrument_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_activity" ADD CONSTRAINT "investment_activity_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_activity" ADD CONSTRAINT "investment_activity_instrument_id_investment_instrument_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."investment_instrument"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_quote" ADD CONSTRAINT "investment_quote_instrument_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."investment_instrument"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_quote_daily" ADD CONSTRAINT "investment_quote_daily_instrument_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."investment_instrument"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "savings_account_workspace_idx" ON "savings_account" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "savings_activity_workspace_idx" ON "savings_activity" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "savings_activity_account_idx" ON "savings_activity" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "savings_activity_date_idx" ON "savings_activity" USING btree ("activity_date");--> statement-breakpoint
CREATE INDEX "investment_instrument_workspace_idx" ON "investment_instrument" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "investment_activity_workspace_idx" ON "investment_activity" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "investment_activity_instrument_idx" ON "investment_activity" USING btree ("instrument_id");--> statement-breakpoint
CREATE INDEX "investment_activity_date_idx" ON "investment_activity" USING btree ("activity_date");--> statement-breakpoint
CREATE UNIQUE INDEX "investment_quote_daily_instrument_date_uq" ON "investment_quote_daily" USING btree ("instrument_id","date");--> statement-breakpoint
CREATE INDEX "investment_quote_daily_instrument_idx" ON "investment_quote_daily" USING btree ("instrument_id");--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_current_workspace_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.workspace_id', true), '')::uuid
$$;--> statement-breakpoint
ALTER TABLE "savings_account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "savings_activity" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "investment_instrument" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "investment_activity" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "investment_quote" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "investment_quote_daily" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "savings_account" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "savings_activity" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "investment_instrument" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "investment_activity" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "investment_quote" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "investment_quote_daily" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY savings_account_workspace_rls ON savings_account
  USING (workspace_id = app_current_workspace_id())
  WITH CHECK (workspace_id = app_current_workspace_id());--> statement-breakpoint
CREATE POLICY savings_activity_workspace_rls ON savings_activity
  USING (workspace_id = app_current_workspace_id())
  WITH CHECK (workspace_id = app_current_workspace_id());--> statement-breakpoint
CREATE POLICY investment_instrument_workspace_rls ON investment_instrument
  USING (workspace_id = app_current_workspace_id())
  WITH CHECK (workspace_id = app_current_workspace_id());--> statement-breakpoint
CREATE POLICY investment_activity_workspace_rls ON investment_activity
  USING (workspace_id = app_current_workspace_id())
  WITH CHECK (workspace_id = app_current_workspace_id());--> statement-breakpoint
CREATE POLICY investment_quote_workspace_rls ON investment_quote
  USING (
    EXISTS (
      SELECT 1 FROM investment_instrument i
      WHERE i.id = instrument_id
        AND i.workspace_id = app_current_workspace_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM investment_instrument i
      WHERE i.id = instrument_id
        AND i.workspace_id = app_current_workspace_id()
    )
  );--> statement-breakpoint
CREATE POLICY investment_quote_daily_workspace_rls ON investment_quote_daily
  USING (
    EXISTS (
      SELECT 1 FROM investment_instrument i
      WHERE i.id = instrument_id
        AND i.workspace_id = app_current_workspace_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM investment_instrument i
      WHERE i.id = instrument_id
        AND i.workspace_id = app_current_workspace_id()
    )
  );
