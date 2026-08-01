ALTER TYPE "money_cadence" ADD VALUE IF NOT EXISTS 'daily';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "money_recurrent_active_next_run_idx" ON "money_recurrent_template" USING btree ("active","next_run_at");
