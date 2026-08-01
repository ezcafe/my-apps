CREATE TABLE IF NOT EXISTS audit_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_sub text,
  workspace_id uuid,
  action text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_event_user_idx ON audit_event (user_sub, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_event_workspace_idx ON audit_event (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_event_action_idx ON audit_event (action, created_at DESC);
