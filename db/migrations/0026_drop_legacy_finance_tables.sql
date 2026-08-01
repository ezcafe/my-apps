DROP TABLE IF EXISTS "savings_activity" CASCADE;
DROP TABLE IF EXISTS "savings_account" CASCADE;
DROP TABLE IF EXISTS "investment_activity" CASCADE;
DROP TYPE IF EXISTS "savings_activity_type";
DROP TYPE IF EXISTS "investment_activity_type";

DELETE FROM "user_workspace_default"
WHERE "app_key" IN ('savings', 'investment', 'loans');
