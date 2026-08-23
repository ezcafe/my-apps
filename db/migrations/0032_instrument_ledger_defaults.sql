ALTER TABLE "investment_instrument" ADD COLUMN "money_account_id" uuid;--> statement-breakpoint
ALTER TABLE "investment_instrument" ADD COLUMN "income_category_id" uuid;--> statement-breakpoint
ALTER TABLE "investment_instrument" ADD COLUMN "expense_category_id" uuid;--> statement-breakpoint
ALTER TABLE "investment_instrument" ADD CONSTRAINT "investment_instrument_money_account_id_fk" FOREIGN KEY ("money_account_id") REFERENCES "public"."money_account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_instrument" ADD CONSTRAINT "investment_instrument_income_category_id_fk" FOREIGN KEY ("income_category_id") REFERENCES "public"."money_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_instrument" ADD CONSTRAINT "investment_instrument_expense_category_id_fk" FOREIGN KEY ("expense_category_id") REFERENCES "public"."money_category"("id") ON DELETE set null ON UPDATE no action;
