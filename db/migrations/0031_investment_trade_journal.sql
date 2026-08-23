CREATE TYPE "public"."investment_trade_journal_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."investment_trade_journal_type" AS ENUM('buy', 'sell');--> statement-breakpoint
CREATE TABLE "investment_trade_journal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"money_account_id" uuid NOT NULL,
	"category_id" uuid,
	"activity_type" "investment_trade_journal_type" NOT NULL,
	"quantity" numeric(24, 8) NOT NULL,
	"open_price" numeric(24, 8) NOT NULL,
	"stop_loss" numeric(24, 8),
	"take_profit" numeric(24, 8),
	"commission_minor" bigint DEFAULT 0 NOT NULL,
	"activity_date" text NOT NULL,
	"notes" text,
	"status" "investment_trade_journal_status" DEFAULT 'open' NOT NULL,
	"close_price" numeric(24, 8),
	"close_fee_minor" bigint,
	"closed_at" timestamp with time zone,
	"realized_pnl_minor" bigint,
	"closed_transaction_id" uuid,
	"created_by_sub" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "investment_trade_journal" ADD CONSTRAINT "investment_trade_journal_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_trade_journal" ADD CONSTRAINT "investment_trade_journal_instrument_id_investment_instrument_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."investment_instrument"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_trade_journal" ADD CONSTRAINT "investment_trade_journal_closed_transaction_id_fk" FOREIGN KEY ("closed_transaction_id") REFERENCES "public"."money_transaction"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "investment_trade_journal_workspace_status_idx" ON "investment_trade_journal" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "investment_trade_journal_instrument_idx" ON "investment_trade_journal" USING btree ("instrument_id");--> statement-breakpoint
ALTER TABLE "investment_trade_journal" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "investment_trade_journal" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY investment_trade_journal_workspace_rls ON investment_trade_journal
  USING (workspace_id = app_current_workspace_id())
  WITH CHECK (workspace_id = app_current_workspace_id());
