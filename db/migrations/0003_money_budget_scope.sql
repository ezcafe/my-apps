CREATE TYPE "public"."money_budget_scope" AS ENUM('workspace', 'category', 'account', 'tag');--> statement-breakpoint
ALTER TABLE "money_budget" ADD COLUMN "scope_type" "public"."money_budget_scope";--> statement-breakpoint
ALTER TABLE "money_budget" ADD COLUMN "scope_id" uuid;--> statement-breakpoint
DELETE FROM "money_budget" AS a USING "money_budget" AS b
WHERE a."category_id" IS NOT NULL
  AND a."category_id" = b."category_id"
  AND a."workspace_id" = b."workspace_id"
  AND a."id" > b."id";--> statement-breakpoint
DELETE FROM "money_budget" AS a USING "money_budget" AS b
WHERE a."category_id" IS NULL
  AND b."category_id" IS NULL
  AND a."workspace_id" = b."workspace_id"
  AND a."id" > b."id";--> statement-breakpoint
UPDATE "money_budget" SET "scope_type" = 'category', "scope_id" = "category_id" WHERE "category_id" IS NOT NULL;--> statement-breakpoint
UPDATE "money_budget" SET "scope_type" = 'workspace', "scope_id" = NULL WHERE "category_id" IS NULL;--> statement-breakpoint
ALTER TABLE "money_budget" ALTER COLUMN "scope_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "money_budget" DROP CONSTRAINT "money_budget_category_id_money_category_id_fk";--> statement-breakpoint
ALTER TABLE "money_budget" DROP COLUMN "category_id";--> statement-breakpoint
ALTER TABLE "money_budget" DROP COLUMN "period_start";--> statement-breakpoint
ALTER TABLE "money_budget" DROP COLUMN "period_end";--> statement-breakpoint
ALTER TABLE "money_budget" ADD CONSTRAINT "money_budget_scope_id_ck" CHECK (("scope_type" = 'workspace' AND "scope_id" IS NULL) OR ("scope_type" <> 'workspace' AND "scope_id" IS NOT NULL));--> statement-breakpoint
CREATE UNIQUE INDEX "money_budget_workspace_one_uq" ON "money_budget" USING btree ("workspace_id") WHERE "scope_type" = 'workspace';--> statement-breakpoint
CREATE UNIQUE INDEX "money_budget_scope_entity_uq" ON "money_budget" USING btree ("workspace_id","scope_type","scope_id") WHERE "scope_type" <> 'workspace';--> statement-breakpoint
CREATE INDEX "money_budget_workspace_scope_idx" ON "money_budget" USING btree ("workspace_id","scope_type");
