CREATE TYPE "public"."loan_status" AS ENUM('active', 'paid_off', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."loan_pay_status" AS ENUM('pending', 'paid', 'skipped');--> statement-breakpoint
CREATE TABLE "loan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"principal_minor" bigint NOT NULL,
	"annual_rate_bps" integer NOT NULL,
	"term_months" integer NOT NULL,
	"start_date" text NOT NULL,
	"due_day_of_month" integer NOT NULL,
	"payment_minor" bigint NOT NULL,
	"money_account_id" uuid,
	"money_category_id" uuid,
	"status" "loan_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loan_due_day_ck" CHECK ("due_day_of_month" >= 1 AND "due_day_of_month" <= 28),
	CONSTRAINT "loan_term_ck" CHECK ("term_months" >= 1),
	CONSTRAINT "loan_principal_ck" CHECK ("principal_minor" > 0)
);--> statement-breakpoint
CREATE TABLE "loan_schedule_installment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_id" uuid NOT NULL,
	"installment_number" integer NOT NULL,
	"due_date" text NOT NULL,
	"payment_minor" bigint NOT NULL,
	"principal_minor" bigint NOT NULL,
	"interest_minor" bigint NOT NULL,
	"balance_after_minor" bigint NOT NULL
);--> statement-breakpoint
CREATE TABLE "loan_installment_status" (
	"schedule_installment_id" uuid PRIMARY KEY NOT NULL,
	"status" "loan_pay_status" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"money_transaction_id" uuid,
	"paid_without_transaction" boolean DEFAULT false NOT NULL,
	"last_notified_at" timestamp with time zone
);--> statement-breakpoint
CREATE TABLE "loan_push_subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_sub" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "loan" ADD CONSTRAINT "loan_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_schedule_installment" ADD CONSTRAINT "loan_schedule_installment_loan_id_loan_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_installment_status" ADD CONSTRAINT "loan_installment_status_schedule_installment_id_loan_schedule_installment_id_fk" FOREIGN KEY ("schedule_installment_id") REFERENCES "public"."loan_schedule_installment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "loan_workspace_idx" ON "loan" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "loan_schedule_installment_loan_num_uq" ON "loan_schedule_installment" USING btree ("loan_id","installment_number");--> statement-breakpoint
CREATE INDEX "loan_schedule_installment_due_idx" ON "loan_schedule_installment" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "loan_installment_status_pending_idx" ON "loan_installment_status" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "loan_push_subscription_user_endpoint_uq" ON "loan_push_subscription" USING btree ("user_sub","endpoint");--> statement-breakpoint
CREATE INDEX "loan_push_subscription_user_idx" ON "loan_push_subscription" USING btree ("user_sub");--> statement-breakpoint
ALTER TABLE "loan" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "loan_schedule_installment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "loan_installment_status" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "loan" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "loan_schedule_installment" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "loan_installment_status" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY loan_workspace_rls ON loan
  USING (workspace_id = app_current_workspace_id())
  WITH CHECK (workspace_id = app_current_workspace_id());--> statement-breakpoint
CREATE POLICY loan_schedule_installment_workspace_rls ON loan_schedule_installment
  USING (
    EXISTS (
      SELECT 1 FROM loan l
      WHERE l.id = loan_id
        AND l.workspace_id = app_current_workspace_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loan l
      WHERE l.id = loan_id
        AND l.workspace_id = app_current_workspace_id()
    )
  );--> statement-breakpoint
CREATE POLICY loan_installment_status_workspace_rls ON loan_installment_status
  USING (
    EXISTS (
      SELECT 1
      FROM loan_schedule_installment si
      INNER JOIN loan l ON l.id = si.loan_id
      WHERE si.id = schedule_installment_id
        AND l.workspace_id = app_current_workspace_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM loan_schedule_installment si
      INNER JOIN loan l ON l.id = si.loan_id
      WHERE si.id = schedule_installment_id
        AND l.workspace_id = app_current_workspace_id()
    )
  );
