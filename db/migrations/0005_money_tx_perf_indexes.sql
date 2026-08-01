CREATE INDEX IF NOT EXISTS "money_tx_workspace_kind_occurred_idx" ON "money_transaction" ("workspace_id", "kind", "occurred_at");
CREATE INDEX IF NOT EXISTS "money_tx_workspace_category_occurred_idx" ON "money_transaction" ("workspace_id", "category_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "money_tx_workspace_merchant_occurred_idx" ON "money_transaction" ("workspace_id", "merchant_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "money_transaction_tag_tag_tx_idx" ON "money_transaction_tag" ("tag_id", "transaction_id");
