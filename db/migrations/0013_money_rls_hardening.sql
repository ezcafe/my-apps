CREATE OR REPLACE FUNCTION app_current_workspace_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.workspace_id', true), '')::uuid
$$;

ALTER TABLE money_account FORCE ROW LEVEL SECURITY;
ALTER TABLE money_category FORCE ROW LEVEL SECURITY;
ALTER TABLE money_tag FORCE ROW LEVEL SECURITY;
ALTER TABLE money_merchant FORCE ROW LEVEL SECURITY;
ALTER TABLE money_recurrent_template FORCE ROW LEVEL SECURITY;
ALTER TABLE money_transaction FORCE ROW LEVEL SECURITY;
ALTER TABLE money_rule FORCE ROW LEVEL SECURITY;
ALTER TABLE money_budget FORCE ROW LEVEL SECURITY;
ALTER TABLE money_transaction_tag FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS money_account_workspace_rls ON money_account;
DROP POLICY IF EXISTS money_category_workspace_rls ON money_category;
DROP POLICY IF EXISTS money_tag_workspace_rls ON money_tag;
DROP POLICY IF EXISTS money_merchant_workspace_rls ON money_merchant;
DROP POLICY IF EXISTS money_recurrent_workspace_rls ON money_recurrent_template;
DROP POLICY IF EXISTS money_transaction_workspace_rls ON money_transaction;
DROP POLICY IF EXISTS money_rule_workspace_rls ON money_rule;
DROP POLICY IF EXISTS money_budget_workspace_rls ON money_budget;
DROP POLICY IF EXISTS money_transaction_tag_workspace_rls ON money_transaction_tag;

CREATE POLICY money_account_workspace_rls ON money_account
  USING (workspace_id = app_current_workspace_id())
  WITH CHECK (workspace_id = app_current_workspace_id());

CREATE POLICY money_category_workspace_rls ON money_category
  USING (workspace_id = app_current_workspace_id())
  WITH CHECK (workspace_id = app_current_workspace_id());

CREATE POLICY money_tag_workspace_rls ON money_tag
  USING (workspace_id = app_current_workspace_id())
  WITH CHECK (workspace_id = app_current_workspace_id());

CREATE POLICY money_merchant_workspace_rls ON money_merchant
  USING (workspace_id = app_current_workspace_id())
  WITH CHECK (workspace_id = app_current_workspace_id());

CREATE POLICY money_recurrent_workspace_rls ON money_recurrent_template
  USING (workspace_id = app_current_workspace_id())
  WITH CHECK (workspace_id = app_current_workspace_id());

CREATE POLICY money_transaction_workspace_rls ON money_transaction
  USING (workspace_id = app_current_workspace_id())
  WITH CHECK (workspace_id = app_current_workspace_id());

CREATE POLICY money_rule_workspace_rls ON money_rule
  USING (workspace_id = app_current_workspace_id())
  WITH CHECK (workspace_id = app_current_workspace_id());

CREATE POLICY money_budget_workspace_rls ON money_budget
  USING (workspace_id = app_current_workspace_id())
  WITH CHECK (workspace_id = app_current_workspace_id());

CREATE POLICY money_transaction_tag_workspace_rls ON money_transaction_tag
  USING (
    EXISTS (
      SELECT 1
      FROM money_transaction t
      WHERE t.id = transaction_id
        AND t.workspace_id = app_current_workspace_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM money_transaction t
      WHERE t.id = transaction_id
        AND t.workspace_id = app_current_workspace_id()
    )
  );
