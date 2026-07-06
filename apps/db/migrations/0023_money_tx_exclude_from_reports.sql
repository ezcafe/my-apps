ALTER TABLE money_transaction
  ADD COLUMN exclude_from_analytics_and_budget boolean NOT NULL DEFAULT false;
