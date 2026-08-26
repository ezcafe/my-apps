CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Non-superuser app role + cron BYPASSRLS role (also created/granted in migrations).
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

DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO money_app', current_database());
END
$$;
GRANT USAGE ON SCHEMA public TO money_app;
GRANT money_cron TO money_app;
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = current_user) THEN
    EXECUTE format('GRANT money_cron TO %I', current_user);
  END IF;
END
$$;
