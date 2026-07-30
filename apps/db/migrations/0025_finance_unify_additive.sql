DO $$ BEGIN
  CREATE TYPE "public"."money_investment_activity_type" AS ENUM(
    'buy',
    'sell',
    'dividend',
    'fee',
    'adjustment',
    'deposit',
    'withdraw'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "money_transaction_investment" (
  "transaction_id" uuid PRIMARY KEY NOT NULL,
  "instrument_id" uuid NOT NULL,
  "activity_type" "money_investment_activity_type" NOT NULL,
  "quantity" numeric(24, 8),
  "unit_price_minor" bigint
);

DO $$ BEGIN
  ALTER TABLE "money_transaction_investment"
    ADD CONSTRAINT "money_transaction_investment_transaction_id_money_transaction_id_fk"
    FOREIGN KEY ("transaction_id") REFERENCES "public"."money_transaction"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "money_transaction_investment"
    ADD CONSTRAINT "money_transaction_investment_instrument_id_investment_instrument_id_fk"
    FOREIGN KEY ("instrument_id") REFERENCES "public"."investment_instrument"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "money_tx_investment_instrument_idx" ON "money_transaction_investment" USING btree ("instrument_id");
CREATE INDEX IF NOT EXISTS "money_tx_investment_type_idx" ON "money_transaction_investment" USING btree ("activity_type");

DO $$ BEGIN
  ALTER TABLE "loan"
    ADD CONSTRAINT "loan_money_account_id_money_account_id_fk"
    FOREIGN KEY ("money_account_id") REFERENCES "public"."money_account"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "loan"
    ADD CONSTRAINT "loan_money_category_id_money_category_id_fk"
    FOREIGN KEY ("money_category_id") REFERENCES "public"."money_category"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "loan_installment_status"
    ADD CONSTRAINT "loan_installment_status_money_transaction_id_money_transaction_id_fk"
    FOREIGN KEY ("money_transaction_id") REFERENCES "public"."money_transaction"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
