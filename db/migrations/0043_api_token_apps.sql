ALTER TABLE "api_token" ADD COLUMN "apps" jsonb;
--> statement-breakpoint
UPDATE "api_token"
SET "apps" = jsonb_build_array("app_key")
WHERE "app_key" IN ('money', 'baby') AND "apps" IS NULL;
