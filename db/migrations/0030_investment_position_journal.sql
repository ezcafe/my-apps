ALTER TABLE "investment_instrument" ADD COLUMN IF NOT EXISTS "contract_size" numeric(24, 8) DEFAULT 1 NOT NULL;--> statement-breakpoint
UPDATE "investment_instrument"
SET "contract_size" = CASE
  WHEN "kind" IN ('stocks', 'coins') THEN 1
  WHEN "kind" = 'fx' AND upper("symbol") LIKE 'XAU%' THEN 100
  WHEN "kind" = 'fx' AND upper("symbol") LIKE 'XAG%' THEN 1000
  WHEN "kind" = 'fx' THEN 100000
  ELSE 1
END;--> statement-breakpoint
ALTER TABLE "money_transaction_investment" ADD COLUMN IF NOT EXISTS "open_price" numeric(24, 8);--> statement-breakpoint
ALTER TABLE "money_transaction_investment" ADD COLUMN IF NOT EXISTS "stop_loss" numeric(24, 8);--> statement-breakpoint
ALTER TABLE "money_transaction_investment" ADD COLUMN IF NOT EXISTS "take_profit" numeric(24, 8);--> statement-breakpoint
UPDATE "money_transaction_investment"
SET "open_price" = ("unit_price_minor"::numeric / 100)
WHERE "unit_price_minor" IS NOT NULL AND "open_price" IS NULL;
