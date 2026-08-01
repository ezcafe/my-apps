-- Fix enum/table name collision (loan_installment_status type vs table) and align RLS with money.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'loan_installment_status'
      AND t.typtype = 'e'
  ) THEN
    ALTER TYPE "public"."loan_installment_status" RENAME TO "loan_pay_status";
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "loan_installment_status"
  ALTER COLUMN "status" SET DEFAULT 'pending'::"loan_pay_status";--> statement-breakpoint
ALTER TABLE "loan" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "loan_schedule_installment" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "loan_installment_status" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS loan_workspace_rls ON loan;--> statement-breakpoint
DROP POLICY IF EXISTS loan_schedule_installment_workspace_rls ON loan_schedule_installment;--> statement-breakpoint
DROP POLICY IF EXISTS loan_installment_status_workspace_rls ON loan_installment_status;--> statement-breakpoint
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
