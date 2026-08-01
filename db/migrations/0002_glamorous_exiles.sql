ALTER TABLE "money_account" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "money_account" ALTER COLUMN "type" SET DEFAULT 'checking'::text;--> statement-breakpoint
DROP TYPE "public"."money_account_type";--> statement-breakpoint
CREATE TYPE "public"."money_account_type" AS ENUM('checking', 'savings', 'cash', 'credit', 'loan', 'investment', 'other');--> statement-breakpoint
ALTER TABLE "money_account" ALTER COLUMN "type" SET DEFAULT 'checking'::"public"."money_account_type";--> statement-breakpoint
ALTER TABLE "money_account" ALTER COLUMN "type" SET DATA TYPE "public"."money_account_type" USING "type"::"public"."money_account_type";