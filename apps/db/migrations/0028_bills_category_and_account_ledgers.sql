-- Seed Bills under Necessities per workspace (if missing).
INSERT INTO money_category (workspace_id, name, kind, parent_id)
SELECT DISTINCT ON (w.id)
  w.id,
  'Bills',
  'expense',
  n.id
FROM workspace w
INNER JOIN money_category n
  ON n.workspace_id = w.id
  AND n.name = 'Necessities'
  AND n.kind = 'expense'
  AND n.parent_id IS NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM money_category b
  WHERE b.workspace_id = w.id
    AND b.name = 'Bills'
)
ORDER BY w.id, n.id;
--> statement-breakpoint
-- Legacy kind=bill → expense with Bills category when unset (one Bills row per workspace).
UPDATE money_transaction t
SET
  kind = 'expense',
  category_id = COALESCE(t.category_id, bills.bills_category_id)
FROM (
  SELECT DISTINCT ON (b.workspace_id)
    b.workspace_id,
    b.id AS bills_category_id
  FROM money_category b
  INNER JOIN money_category n
    ON b.parent_id = n.id
    AND n.name = 'Necessities'
    AND n.parent_id IS NULL
  WHERE b.name = 'Bills'
  ORDER BY b.workspace_id, b.id
) AS bills
WHERE t.workspace_id = bills.workspace_id
  AND t.kind::text = 'bill';
