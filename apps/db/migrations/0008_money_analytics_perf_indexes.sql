CREATE INDEX IF NOT EXISTS "money_tx_workspace_account_occurred_idx"
  ON "money_transaction" ("workspace_id", "account_id", "occurred_at");

CREATE INDEX IF NOT EXISTS "money_tx_workspace_recurrence_occurred_idx"
  ON "money_transaction" ("workspace_id", "recurrence_source_id", "occurred_at");
