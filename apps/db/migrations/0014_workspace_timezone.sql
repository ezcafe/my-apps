ALTER TABLE workspace
  ADD COLUMN IF NOT EXISTS tz_name text NOT NULL DEFAULT 'UTC';

ALTER TABLE workspace
  ADD CONSTRAINT workspace_tz_name_nonempty_ck CHECK (tz_name <> '');
