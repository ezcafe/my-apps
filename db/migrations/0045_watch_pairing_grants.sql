ALTER TABLE "watch_pairing_code" ADD COLUMN "apps" jsonb DEFAULT '["baby"]'::jsonb;
--> statement-breakpoint
ALTER TABLE "watch_pairing_code" ADD COLUMN "scopes" jsonb DEFAULT '["read","write"]'::jsonb;
--> statement-breakpoint
UPDATE "watch_pairing_code" SET "apps" = '["baby"]'::jsonb WHERE "apps" IS NULL;
--> statement-breakpoint
UPDATE "watch_pairing_code" SET "scopes" = '["read","write"]'::jsonb WHERE "scopes" IS NULL;
--> statement-breakpoint
ALTER TABLE "watch_pairing_code" ALTER COLUMN "apps" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "watch_pairing_code" ALTER COLUMN "scopes" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "watch_pairing_code" ALTER COLUMN "apps" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "watch_pairing_code" ALTER COLUMN "scopes" DROP DEFAULT;
