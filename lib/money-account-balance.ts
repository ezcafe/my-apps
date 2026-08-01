import { and, eq, sql } from "drizzle-orm";
import type { AppDatabase } from "@/db";
import { moneyAccount, moneyTransaction } from "@/db/schema/money";

export type MoneyTx = Parameters<Parameters<AppDatabase["transaction"]>[0]>[0];

export type TxRowForBalance = {
  id: string;
  accountId: string;
  kind: "expense" | "income" | "transfer";
  amountMinor: number;
  occurredAt: Date;
  createdAt: Date;
  transferPairId: string | null;
};

export function sortTransferPairRows(rows: TxRowForBalance[]): TxRowForBalance[] {
  return [...rows].sort((a, b) => {
    const ta = a.occurredAt.getTime() - b.occurredAt.getTime();
    if (ta !== 0) return ta;
    const ca = a.createdAt.getTime() - b.createdAt.getTime();
    if (ca !== 0) return ca;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Signed effect of this row on `row.accountId`.
 * For a two-leg transfer, pass the ordered pair (first = out, second = in).
 */
export function effectOnAccount(
  row: TxRowForBalance,
  orderedPair: TxRowForBalance[] | null,
): number {
  const amt = row.amountMinor;
  if (row.kind === "expense") return -amt;
  if (row.kind === "income") return amt;
  if (!row.transferPairId || !orderedPair || orderedPair.length !== 2) {
    return -amt;
  }
  const idx = orderedPair.findIndex((r) => r.id === row.id);
  if (idx === 0) return -amt;
  if (idx === 1) return amt;
  return -amt;
}

export async function loadTransferPairRows(
  tx: MoneyTx,
  workspaceId: string,
  transferPairId: string,
): Promise<TxRowForBalance[]> {
  const rows = await tx
    .select({
      id: moneyTransaction.id,
      accountId: moneyTransaction.accountId,
      kind: moneyTransaction.kind,
      amountMinor: moneyTransaction.amountMinor,
      occurredAt: moneyTransaction.occurredAt,
      createdAt: moneyTransaction.createdAt,
      transferPairId: moneyTransaction.transferPairId,
    })
    .from(moneyTransaction)
    .where(
      and(
        eq(moneyTransaction.workspaceId, workspaceId),
        eq(moneyTransaction.transferPairId, transferPairId),
      ),
    );
  return sortTransferPairRows(rows as TxRowForBalance[]);
}

export async function resolveOrderedPair(
  tx: MoneyTx,
  workspaceId: string,
  row: TxRowForBalance,
): Promise<TxRowForBalance[] | null> {
  if (row.kind !== "transfer" || !row.transferPairId) return null;
  const rows = await loadTransferPairRows(tx, workspaceId, row.transferPairId);
  if (rows.length !== 2) return null;
  return rows;
}

export async function effectOnAccountForRow(
  tx: MoneyTx,
  workspaceId: string,
  row: TxRowForBalance,
): Promise<number> {
  const pair = await resolveOrderedPair(tx, workspaceId, row);
  return effectOnAccount(row, pair);
}

async function assertAccountInWorkspace(
  tx: MoneyTx,
  workspaceId: string,
  accountId: string,
): Promise<void> {
  const [r] = await tx
    .select({ id: moneyAccount.id })
    .from(moneyAccount)
    .where(
      and(
        eq(moneyAccount.id, accountId),
        eq(moneyAccount.workspaceId, workspaceId),
      ),
    )
    .for("update")
    .limit(1);
  if (!r) {
    throw new Error(`Account not found for balance update: ${accountId}`);
  }
}

export async function lockAccountsSorted(
  tx: MoneyTx,
  workspaceId: string,
  accountIds: string[],
): Promise<void> {
  const unique = [...new Set(accountIds)].sort();
  for (const id of unique) {
    await assertAccountInWorkspace(tx, workspaceId, id);
  }
}

export async function applyBalanceDeltaAfterLock(
  tx: MoneyTx,
  workspaceId: string,
  accountId: string,
  delta: number,
): Promise<void> {
  if (delta === 0) return;
  await tx
    .update(moneyAccount)
    .set({ balanceMinor: sql`${moneyAccount.balanceMinor} + ${delta}` })
    .where(
      and(
        eq(moneyAccount.id, accountId),
        eq(moneyAccount.workspaceId, workspaceId),
      ),
    );
}

export async function applyBalanceDelta(
  tx: MoneyTx,
  workspaceId: string,
  accountId: string,
  delta: number,
): Promise<void> {
  if (delta === 0) return;
  await lockAccountsSorted(tx, workspaceId, [accountId]);
  await applyBalanceDeltaAfterLock(tx, workspaceId, accountId, delta);
}

/** Apply net deltas per account (locks all involved accounts in sorted order first). */
export async function applyBalanceDeltas(
  tx: MoneyTx,
  workspaceId: string,
  deltasByAccount: Map<string, number>,
): Promise<void> {
  const entries = [...deltasByAccount.entries()].filter(([, d]) => d !== 0);
  if (entries.length === 0) return;
  await lockAccountsSorted(
    tx,
    workspaceId,
    entries.map(([id]) => id),
  );
  for (const [accountId, delta] of entries) {
    await applyBalanceDeltaAfterLock(tx, workspaceId, accountId, delta);
  }
}

export async function applyTransactionBalanceEffect(
  tx: MoneyTx,
  workspaceId: string,
  row: TxRowForBalance,
  sign: 1 | -1,
): Promise<void> {
  const e = await effectOnAccountForRow(tx, workspaceId, row);
  await applyBalanceDelta(tx, workspaceId, row.accountId, sign * e);
}

/** Per-account effects for each row in `rows` using one ordered pair context. */
export function accountEffectsForRows(
  rows: TxRowForBalance[],
  orderedPair: TxRowForBalance[] | null,
): Map<string, number> {
  const m = new Map<string, number>();
  const pair = orderedPair && orderedPair.length === 2 ? orderedPair : null;
  for (const r of rows) {
    const e = effectOnAccount(r, pair);
    m.set(r.accountId, (m.get(r.accountId) ?? 0) + e);
  }
  return m;
}

export async function accountEffectsSnapshotForTransaction(
  tx: MoneyTx,
  workspaceId: string,
  row: TxRowForBalance,
): Promise<Map<string, number>> {
  if (row.kind === "transfer" && row.transferPairId) {
    const pairRows = await loadTransferPairRows(
      tx,
      workspaceId,
      row.transferPairId,
    );
    const ordered = pairRows.length === 2 ? pairRows : null;
    return accountEffectsForRows(pairRows, ordered);
  }
  const m = new Map<string, number>();
  m.set(row.accountId, effectOnAccount(row, null));
  return m;
}

/**
 * Call after the row is updated in `tx`. Pass `oldTotals` from
 * `accountEffectsSnapshotForTransaction` run **before** the UPDATE so pair rows
 * are read from pre-update state.
 */
export async function applyBalanceAfterTransactionUpdate(
  tx: MoneyTx,
  workspaceId: string,
  oldTotals: Map<string, number>,
  after: TxRowForBalance,
): Promise<void> {
  const newTotals = await accountEffectsSnapshotForTransaction(
    tx,
    workspaceId,
    after,
  );
  const deltas = new Map<string, number>();
  const keys = new Set([...oldTotals.keys(), ...newTotals.keys()]);
  for (const k of keys) {
    deltas.set(k, (newTotals.get(k) ?? 0) - (oldTotals.get(k) ?? 0));
  }
  await applyBalanceDeltas(tx, workspaceId, deltas);
}

export async function applyBalanceAfterTransactionDelete(
  tx: MoneyTx,
  workspaceId: string,
  deleted: TxRowForBalance,
): Promise<void> {
  const pairBefore =
    deleted.kind === "transfer" && deleted.transferPairId
      ? await loadTransferPairRows(tx, workspaceId, deleted.transferPairId)
      : [];

  const sibling =
    pairBefore.length === 2
      ? (pairBefore.find((r) => r.id !== deleted.id) ?? null)
      : null;

  let oldTotals: Map<string, number>;
  if (deleted.kind === "transfer" && deleted.transferPairId) {
    const orderedBefore = pairBefore.length === 2 ? pairBefore : null;
    oldTotals = accountEffectsForRows(pairBefore, orderedBefore);
  } else {
    oldTotals = new Map([
      [deleted.accountId, effectOnAccount(deleted, null)],
    ]);
  }

  await tx
    .delete(moneyTransaction)
    .where(
      and(
        eq(moneyTransaction.id, deleted.id),
        eq(moneyTransaction.workspaceId, workspaceId),
      ),
    );

  const newTotals = new Map<string, number>();
  if (sibling) {
    const [sib] = await tx
      .select({
        id: moneyTransaction.id,
        accountId: moneyTransaction.accountId,
        kind: moneyTransaction.kind,
        amountMinor: moneyTransaction.amountMinor,
        occurredAt: moneyTransaction.occurredAt,
        createdAt: moneyTransaction.createdAt,
        transferPairId: moneyTransaction.transferPairId,
      })
      .from(moneyTransaction)
      .where(eq(moneyTransaction.id, sibling.id))
      .limit(1);
    if (sib) {
      const br: TxRowForBalance = {
        id: sib.id,
        accountId: sib.accountId,
        kind: sib.kind as TxRowForBalance["kind"],
        amountMinor: sib.amountMinor,
        occurredAt: sib.occurredAt,
        createdAt: sib.createdAt,
        transferPairId: sib.transferPairId,
      };
      const snap = await accountEffectsSnapshotForTransaction(
        tx,
        workspaceId,
        br,
      );
      for (const [k, v] of snap) newTotals.set(k, v);
    }
  }

  const deltas = new Map<string, number>();
  const keys = new Set([...oldTotals.keys(), ...newTotals.keys()]);
  for (const k of keys) {
    deltas.set(k, (newTotals.get(k) ?? 0) - (oldTotals.get(k) ?? 0));
  }
  await applyBalanceDeltas(tx, workspaceId, deltas);
}
