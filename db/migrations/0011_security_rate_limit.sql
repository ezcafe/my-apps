CREATE TABLE IF NOT EXISTS security_rate_limit (
  key text NOT NULL,
  bucket_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key, bucket_start)
);

CREATE INDEX IF NOT EXISTS security_rate_limit_bucket_idx
  ON security_rate_limit (bucket_start);
