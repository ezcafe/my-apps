CREATE TYPE "public"."money_category_kind" AS ENUM('expense', 'income');--> statement-breakpoint
ALTER TABLE "money_category" ADD COLUMN "kind" "public"."money_category_kind" NOT NULL DEFAULT 'expense';--> statement-breakpoint
ALTER TABLE "money_category" ALTER COLUMN "kind" DROP DEFAULT;--> statement-breakpoint
CREATE INDEX "money_category_workspace_kind_idx" ON "money_category" USING btree ("workspace_id","kind");--> statement-breakpoint
ALTER TABLE "money_rule" ADD COLUMN "kind" "public"."money_category_kind" NOT NULL DEFAULT 'expense';--> statement-breakpoint
UPDATE "money_rule" r
SET "kind" = c."kind"
FROM "money_category" c
WHERE r."action" ? 'setCategoryId'
  AND c."id" = (r."action"->>'setCategoryId')::uuid
  AND c."workspace_id" = r."workspace_id";--> statement-breakpoint
ALTER TABLE "money_rule" ALTER COLUMN "kind" DROP DEFAULT;--> statement-breakpoint
CREATE INDEX "money_rule_workspace_kind_idx" ON "money_rule" USING btree ("workspace_id","kind");
