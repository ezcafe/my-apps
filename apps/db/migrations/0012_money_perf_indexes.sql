CREATE INDEX IF NOT EXISTS money_tx_workspace_transfer_pair_idx
  ON money_transaction (workspace_id, transfer_pair_id)
  WHERE transfer_pair_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS money_tx_workspace_occurred_cover_idx
  ON money_transaction (workspace_id, occurred_at)
  INCLUDE (kind, amount_minor);

CREATE INDEX IF NOT EXISTS audit_event_workspace_action_created_idx
  ON audit_event (workspace_id, action, created_at DESC);
