ALTER TABLE "money_account" ADD COLUMN "system_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "money_account_workspace_system_key_uq" ON "money_account" USING btree ("workspace_id","system_key") WHERE "system_key" IS NOT NULL;--> statement-breakpoint
-- Claim existing seeded accounts (legacy + new display names) so we do not double every workspace.
WITH claimable AS (
  SELECT DISTINCT ON (a.workspace_id, v.system_key)
    a.id,
    v.system_key
  FROM (
    VALUES
      ('credit', 'credit', 'Credit Card'),
      ('savings', 'savings', 'Savings'),
      ('investment', 'investment', 'Investment'),
      ('investment', 'investment', 'Investments'),
      ('loan', 'loan', 'Loan'),
      ('loan', 'loan', 'Loans')
  ) AS v(system_key, account_type, account_name)
  INNER JOIN money_account a
    ON a.type::text = v.account_type
    AND a.name = v.account_name
    AND a.system_key IS NULL
  WHERE NOT EXISTS (
    SELECT 1
    FROM money_account s
    WHERE s.workspace_id = a.workspace_id
      AND s.system_key = v.system_key
  )
  ORDER BY a.workspace_id, v.system_key, a.created_at ASC, a.id ASC
)
UPDATE money_account a
SET system_key = claimable.system_key
FROM claimable
WHERE a.id = claimable.id;--> statement-breakpoint
-- Insert any still-missing system accounts per workspace.
INSERT INTO money_account (workspace_id, name, type, currency, sort_order, system_key)
SELECT
  w.id,
  seed.name,
  seed.account_type::money_account_type,
  COALESCE(w.default_currency, 'USD'),
  seed.sort_order,
  seed.system_key
FROM workspace w
CROSS JOIN (
  VALUES
    ('credit', 'Credit Card', 'credit', 0),
    ('savings', 'Savings', 'savings', 1),
    ('investment', 'Investments', 'investment', 2),
    ('loan', 'Loans', 'loan', 3)
) AS seed(system_key, name, account_type, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM money_account a
  WHERE a.workspace_id = w.id
    AND a.system_key = seed.system_key
);
