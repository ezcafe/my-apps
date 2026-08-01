#!/usr/bin/env node
/**
 * Reconciles each money_account.balance_minor to the sum of transaction effects only
 * (see lib/money-account-balance.ts for rules). The runtime trigger should already
 * keep balances correct; this script is a maintenance backstop for drift detection.
 *
 * Usage: DATABASE_URL=... node scripts/recompute-money-balances.mjs
 */
import "dotenv/config";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

/** Keep in sync with sortTransferPairRows in lib/money-account-balance.ts */
function sortTransferPairRows(rows) {
  return [...rows].sort((a, b) => {
    const ta = new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime();
    if (ta !== 0) return ta;
    const ca = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (ca !== 0) return ca;
    return String(a.id).localeCompare(String(b.id));
  });
}

/** Keep in sync with effectOnAccount in lib/money-account-balance.ts */
function effectOnAccount(row, orderedPair) {
  const amt = Number(row.amount_minor);
  if (row.kind === "expense") return -amt;
  if (row.kind === "income") return amt;
  if (!row.transfer_pair_id || !orderedPair || orderedPair.length !== 2) {
    return -amt;
  }
  const idx = orderedPair.findIndex((r) => r.id === row.id);
  if (idx === 0) return -amt;
  if (idx === 1) return amt;
  return -amt;
}

const sql = postgres(url, { max: 1 });
try {
  const txs = await sql`
    SELECT id, workspace_id, account_id, kind, amount_minor, occurred_at, created_at, transfer_pair_id
    FROM money_transaction
  `;

  const byPair = new Map();
  for (const t of txs) {
    if (t.kind === "transfer" && t.transfer_pair_id) {
      const k = `${t.workspace_id}::${t.transfer_pair_id}`;
      if (!byPair.has(k)) byPair.set(k, []);
      byPair.get(k).push(t);
    }
  }

  const pairOrder = new Map();
  for (const [k, rows] of byPair) {
    pairOrder.set(k, rows.length === 2 ? sortTransferPairRows(rows) : null);
  }

  const totals = new Map();
  function add(workspaceId, accountId, delta) {
    const key = `${workspaceId}::${accountId}`;
    totals.set(key, (totals.get(key) ?? 0) + delta);
  }

  for (const t of txs) {
    let ordered = null;
    if (t.kind === "transfer" && t.transfer_pair_id) {
      ordered = pairOrder.get(`${t.workspace_id}::${t.transfer_pair_id}`) ?? null;
    }
    const e = effectOnAccount(t, ordered);
    add(t.workspace_id, t.account_id, e);
  }

  const accounts = await sql`
    SELECT id, workspace_id FROM money_account
  `;

  for (const a of accounts) {
    const key = `${a.workspace_id}::${a.id}`;
    const sum = totals.get(key) ?? 0;
    await sql`
      UPDATE money_account
      SET balance_minor = ${sum}
      WHERE id = ${a.id} AND workspace_id = ${a.workspace_id}
    `;
  }

  console.log(`Updated ${accounts.length} account(s) from ${txs.length} transaction(s).`);
} finally {
  await sql.end({ timeout: 10 });
}
