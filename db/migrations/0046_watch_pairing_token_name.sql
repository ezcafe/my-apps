ALTER TABLE "watch_pairing_code" ADD COLUMN "token_name" text DEFAULT 'API pairing';
--> statement-breakpoint
UPDATE "watch_pairing_code" SET "token_name" = 'API pairing' WHERE "token_name" IS NULL;
--> statement-breakpoint
ALTER TABLE "watch_pairing_code" ALTER COLUMN "token_name" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "watch_pairing_code" ALTER COLUMN "token_name" DROP DEFAULT;
