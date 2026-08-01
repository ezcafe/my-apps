-- Phase 1 (shadow-compatible): enforce workspace scoping when app.workspace_id is set.
ALTER TABLE money_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_merchant ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_recurrent_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_transaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_rule ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_transaction_tag ENABLE ROW LEVEL SECURITY;

CREATE POLICY money_account_workspace_rls ON money_account
  USING (
    current_setting('app.workspace_id', true) IS NULL
    OR workspace_id::text = current_setting('app.workspace_id', true)
  );
CREATE POLICY money_category_workspace_rls ON money_category
  USING (
    current_setting('app.workspace_id', true) IS NULL
    OR workspace_id::text = current_setting('app.workspace_id', true)
  );
CREATE POLICY money_tag_workspace_rls ON money_tag
  USING (
    current_setting('app.workspace_id', true) IS NULL
    OR workspace_id::text = current_setting('app.workspace_id', true)
  );
CREATE POLICY money_merchant_workspace_rls ON money_merchant
  USING (
    current_setting('app.workspace_id', true) IS NULL
    OR workspace_id::text = current_setting('app.workspace_id', true)
  );
CREATE POLICY money_recurrent_workspace_rls ON money_recurrent_template
  USING (
    current_setting('app.workspace_id', true) IS NULL
    OR workspace_id::text = current_setting('app.workspace_id', true)
  );
CREATE POLICY money_transaction_workspace_rls ON money_transaction
  USING (
    current_setting('app.workspace_id', true) IS NULL
    OR workspace_id::text = current_setting('app.workspace_id', true)
  );
CREATE POLICY money_rule_workspace_rls ON money_rule
  USING (
    current_setting('app.workspace_id', true) IS NULL
    OR workspace_id::text = current_setting('app.workspace_id', true)
  );
CREATE POLICY money_budget_workspace_rls ON money_budget
  USING (
    current_setting('app.workspace_id', true) IS NULL
    OR workspace_id::text = current_setting('app.workspace_id', true)
  );
CREATE POLICY money_transaction_tag_workspace_rls ON money_transaction_tag
  USING (
    current_setting('app.workspace_id', true) IS NULL
    OR EXISTS (
      SELECT 1
      FROM money_transaction t
      WHERE t.id = transaction_id
        AND t.workspace_id::text = current_setting('app.workspace_id', true)
    )
  );
