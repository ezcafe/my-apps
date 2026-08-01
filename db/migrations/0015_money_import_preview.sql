CREATE TABLE IF NOT EXISTS money_import_preview (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_sub text NOT NULL,
  workspace_id uuid NOT NULL REFERENCES workspace(id) ON DELETE cascade,
  rows jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS money_import_preview_expires_idx
  ON money_import_preview (expires_at);

CREATE INDEX IF NOT EXISTS money_import_preview_user_workspace_idx
  ON money_import_preview (user_sub, workspace_id);
