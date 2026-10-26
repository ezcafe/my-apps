CREATE TABLE IF NOT EXISTS baby_import_preview (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_sub text NOT NULL,
  workspace_id uuid NOT NULL REFERENCES workspace(id) ON DELETE cascade,
  rows jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS baby_import_preview_expires_idx
  ON baby_import_preview (expires_at);

CREATE INDEX IF NOT EXISTS baby_import_preview_user_workspace_idx
  ON baby_import_preview (user_sub, workspace_id);

ALTER TABLE baby_import_preview ENABLE ROW LEVEL SECURITY;
ALTER TABLE baby_import_preview FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS baby_import_preview_workspace_rls ON baby_import_preview;
CREATE POLICY baby_import_preview_workspace_rls ON baby_import_preview
  USING (workspace_id = app_current_workspace_id())
  WITH CHECK (workspace_id = app_current_workspace_id());

CREATE TABLE IF NOT EXISTS loans_import_preview (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_sub text NOT NULL,
  workspace_id uuid NOT NULL REFERENCES workspace(id) ON DELETE cascade,
  rows jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loans_import_preview_expires_idx
  ON loans_import_preview (expires_at);

CREATE INDEX IF NOT EXISTS loans_import_preview_user_workspace_idx
  ON loans_import_preview (user_sub, workspace_id);

ALTER TABLE loans_import_preview ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans_import_preview FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS loans_import_preview_workspace_rls ON loans_import_preview;
CREATE POLICY loans_import_preview_workspace_rls ON loans_import_preview
  USING (workspace_id = app_current_workspace_id())
  WITH CHECK (workspace_id = app_current_workspace_id());
