#!/usr/bin/env node
/**
 * Idempotent migration of legacy savings / investment_activity rows into Money ledger.
 * Run after 0025_finance_unify_additive.sql and before 0026_drop_legacy_finance_tables.sql.
 *
 * Usage: DATABASE_URL=... node scripts/backfill-finance-unify.mjs
 */
import "dotenv/config";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

function savingsTypeToKind(type) {
  if (type === "withdraw") return "expense";
  return "income";
}

function investmentTypeToKind(type) {
  switch (type) {
    case "buy":
    case "fee":
    case "withdraw":
      return "expense";
    case "sell":
    case "dividend":
    case "deposit":
      return "income";
    default:
      return "expense";
  }
}

function activityDateToIso(activityDate) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(activityDate)) {
    return `${activityDate}T12:00:00.000Z`;
  }
  return new Date(activityDate).toISOString();
}

const sql = postgres(url, { max: 1 });

try {
  const savingsAccounts = await sql`
    SELECT id, workspace_id, name, currency, sort_order, archived
    FROM savings_account
  `.catch(() => []);

  const accountMap = new Map();
  for (const sa of savingsAccounts) {
    const existing = await sql`
      SELECT id FROM money_account
      WHERE workspace_id = ${sa.workspace_id}
        AND type = 'savings'
        AND name = ${sa.name}
      LIMIT 1
    `;
    if (existing.length) {
      accountMap.set(sa.id, existing[0].id);
      continue;
    }
    const inserted = await sql`
      INSERT INTO money_account (workspace_id, name, type, currency, sort_order, archived)
      VALUES (
        ${sa.workspace_id},
        ${sa.name},
        'savings',
        ${sa.currency},
        ${sa.sort_order},
        ${sa.archived !== 0}
      )
      RETURNING id
    `;
    accountMap.set(sa.id, inserted[0].id);
  }

  const savingsActivities = await sql`
    SELECT * FROM savings_activity
  `.catch(() => []);

  for (const act of savingsActivities) {
    const moneyAccountId = accountMap.get(act.account_id);
    if (!moneyAccountId) continue;
    if (act.money_transaction_id) {
      const linked = await sql`
        SELECT id FROM money_transaction WHERE id = ${act.money_transaction_id} LIMIT 1
      `;
      if (linked.length) continue;
    }
    const kind = savingsTypeToKind(act.type);
    const [tx] = await sql`
      INSERT INTO money_transaction (
        workspace_id, account_id, kind, amount_minor, occurred_at, notes, created_by_sub
      )
      VALUES (
        ${act.workspace_id},
        ${moneyAccountId},
        ${kind},
        ${act.amount_minor},
        ${activityDateToIso(act.activity_date)},
        ${act.notes},
        'finance-backfill'
      )
      RETURNING id
    `;
    void tx;
  }

  const investmentActivities = await sql`
    SELECT * FROM investment_activity
  `.catch(() => []);

  for (const act of investmentActivities) {
    const existingExt = await sql`
      SELECT transaction_id FROM money_transaction_investment
      WHERE transaction_id = ${act.money_transaction_id ?? act.id}
      LIMIT 1
    `;
    if (existingExt.length) continue;

    let txId = act.money_transaction_id;
    if (!txId) {
      let accountId = act.money_account_id;
      if (!accountId) {
        const inst = await sql`
          SELECT currency FROM investment_instrument WHERE id = ${act.instrument_id} LIMIT 1
        `;
        const currency = inst[0]?.currency ?? "USD";
        const acc = await sql`
          SELECT id FROM money_account
          WHERE workspace_id = ${act.workspace_id}
            AND type = 'investment'
            AND currency = ${currency}
          LIMIT 1
        `;
        if (!acc.length) {
          const created = await sql`
            INSERT INTO money_account (workspace_id, name, type, currency)
            VALUES (
              ${act.workspace_id},
              ${`Investments (${currency})`},
              'investment',
              ${currency}
            )
            RETURNING id
          `;
          accountId = created[0].id;
        } else {
          accountId = acc[0].id;
        }
      }
      const kind = investmentTypeToKind(act.type);
      const amountMinor = act.amount_minor ?? 0;
      if (amountMinor <= 0) continue;
      const inserted = await sql`
        INSERT INTO money_transaction (
          workspace_id, account_id, kind, amount_minor, occurred_at, notes, created_by_sub
        )
        VALUES (
          ${act.workspace_id},
          ${accountId},
          ${kind},
          ${amountMinor},
          ${activityDateToIso(act.activity_date)},
          ${act.notes},
          'finance-backfill'
        )
        RETURNING id
      `;
      txId = inserted[0].id;
    }

    await sql`
      INSERT INTO money_transaction_investment (
        transaction_id, instrument_id, activity_type, quantity, unit_price_minor
      )
      VALUES (
        ${txId},
        ${act.instrument_id},
        ${act.type}::money_investment_activity_type,
        ${act.quantity},
        ${act.unit_price_minor}
      )
      ON CONFLICT (transaction_id) DO NOTHING
    `;
  }

  const loansWithoutAccount = await sql`
    SELECT id, workspace_id, name, currency, principal_minor
    FROM loan
    WHERE money_account_id IS NULL
  `;

  for (const loan of loansWithoutAccount) {
    const [acc] = await sql`
      INSERT INTO money_account (workspace_id, name, type, currency, balance_minor)
      VALUES (
        ${loan.workspace_id},
        ${loan.name},
        'loan',
        ${loan.currency},
        ${-loan.principal_minor}
      )
      RETURNING id
    `;
    await sql`
      UPDATE loan SET money_account_id = ${acc.id} WHERE id = ${loan.id}
    `;
  }

  console.log("Finance unify backfill completed.");
} finally {
  await sql.end();
}
