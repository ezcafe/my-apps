CREATE OR REPLACE FUNCTION money_recompute_account_balance_for(account_uuid uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE money_account a
  SET balance_minor = COALESCE((
    WITH tx AS (
      SELECT
        t.account_id,
        t.kind,
        t.amount_minor,
        t.transfer_pair_id,
        ROW_NUMBER() OVER (
          PARTITION BY t.workspace_id, t.transfer_pair_id
          ORDER BY t.occurred_at ASC, t.created_at ASC, t.id ASC
        ) AS transfer_pos
      FROM money_transaction t
      WHERE t.account_id = a.id
    )
    SELECT SUM(
      CASE
        WHEN kind = 'income' THEN amount_minor
        WHEN kind = 'expense' THEN -amount_minor
        WHEN kind = 'transfer' AND transfer_pair_id IS NOT NULL AND transfer_pos = 2
          THEN amount_minor
        WHEN kind = 'transfer' THEN -amount_minor
        ELSE 0
      END
    )
    FROM tx
  ), 0)
  WHERE a.id = account_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION money_sync_balance_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM money_recompute_account_balance_for(NEW.account_id);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.account_id IS DISTINCT FROM NEW.account_id THEN
      PERFORM money_recompute_account_balance_for(OLD.account_id);
    END IF;
    PERFORM money_recompute_account_balance_for(NEW.account_id);
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM money_recompute_account_balance_for(OLD.account_id);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS money_balance_sync_trigger ON money_transaction;
CREATE TRIGGER money_balance_sync_trigger
AFTER INSERT OR UPDATE OR DELETE ON money_transaction
FOR EACH ROW
EXECUTE FUNCTION money_sync_balance_trigger();
