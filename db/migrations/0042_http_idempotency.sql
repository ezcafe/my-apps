CREATE TABLE IF NOT EXISTS http_idempotency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  user_sub text NOT NULL,
  route text NOT NULL,
  key text NOT NULL,
  request_hash text NOT NULL,
  status text NOT NULL CHECK (status IN ('in_progress', 'completed')),
  response_status integer NULL,
  response_body jsonb NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  CONSTRAINT http_idempotency_workspace_user_route_key_uq
    UNIQUE (workspace_id, user_sub, route, key)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS http_idempotency_expires_idx
  ON http_idempotency (expires_at);
