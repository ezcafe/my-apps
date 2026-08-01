ALTER TABLE "loan" ADD COLUMN "initial_rate_months" integer;
--> statement-breakpoint
ALTER TABLE "loan" ADD COLUMN "rate_after_initial_bps" integer;
--> statement-breakpoint
ALTER TABLE "loan" ADD COLUMN "payment_after_rate_change_minor" bigint;
--> statement-breakpoint
ALTER TABLE "loan" ADD CONSTRAINT "loan_rate_schedule_ck" CHECK (
  "initial_rate_months" IS NULL
  OR "initial_rate_months" >= "term_months"
  OR "rate_after_initial_bps" IS NOT NULL
);
