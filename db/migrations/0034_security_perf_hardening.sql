-- App role without BYPASSRLS (defense-in-depth when DATABASE_URL uses money_app).
-- Cron role with BYPASSRLS for cross-tenant scans (SET LOCAL ROLE money_cron).
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'money_app') THEN
    CREATE ROLE money_app LOGIN PASSWORD 'money' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'money_cron') THEN
    CREATE ROLE money_cron NOLOGIN NOSUPERUSER BYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO money_app;
DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO money_app', current_database());
END
$$;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO money_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO money_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO money_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO money_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO money_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO money_app;

GRANT money_cron TO money_app;
-- Allow session user (e.g. money / migrator) to assume cron role as well.
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = current_user) THEN
    EXECUTE format('GRANT money_cron TO %I', current_user);
  END IF;
END
$$;

-- RLS for tables previously relying on app filters only.
ALTER TABLE money_import_preview ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_import_preview FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS money_import_preview_workspace_rls ON money_import_preview;
CREATE POLICY money_import_preview_workspace_rls ON money_import_preview
  USING (workspace_id = app_current_workspace_id())
  WITH CHECK (workspace_id = app_current_workspace_id());

ALTER TABLE money_transaction_investment ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_transaction_investment FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS money_transaction_investment_workspace_rls ON money_transaction_investment;
CREATE POLICY money_transaction_investment_workspace_rls ON money_transaction_investment
  USING (
    EXISTS (
      SELECT 1
      FROM money_transaction t
      WHERE t.id = transaction_id
        AND t.workspace_id = app_current_workspace_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM money_transaction t
      WHERE t.id = transaction_id
        AND t.workspace_id = app_current_workspace_id()
    )
  );

-- Balance is maintained incrementally in app code (lib/money-account-balance.ts).
-- The full-recompute trigger was O(n) per row and duplicated app updates.
DROP TRIGGER IF EXISTS money_balance_sync_trigger ON money_transaction;

-- Hot-path indexes
CREATE INDEX IF NOT EXISTS money_transaction_workspace_occurred_id_idx
  ON money_transaction (workspace_id, occurred_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS loan_schedule_installment_loan_number_idx
  ON loan_schedule_installment (loan_id, installment_number);

-- Unique lookup hash for API tokens (nullable for legacy rows).
ALTER TABLE api_token ADD COLUMN IF NOT EXISTS key_lookup text;
CREATE UNIQUE INDEX IF NOT EXISTS api_token_key_lookup_uq ON api_token (key_lookup)
  WHERE key_lookup IS NOT NULL;
