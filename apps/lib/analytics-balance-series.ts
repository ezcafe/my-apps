import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { moneyAccount, moneyTransaction } from "@/db/schema/money";
import {
  effectOnAccount,
  sortTransferPairRows,
  type TxRowForBalance,
} from "@/lib/money-account-balance";

export type BalanceSeriesPoint = { date: string; totalMinor: number };

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatUtcDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function endOfUtcDay(dateStr: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y!, mo! - 1, d!, 23, 59, 59, 999));
}

function daysBetweenInclusive(fromDate: string, toDate: string): string[] {
  const out: string[] = [];
  const [y0, m0, d0] = fromDate.split("-").map(Number);
  const [y1, m1, d1] = toDate.split("-").map(Number);
  const cur = new Date(Date.UTC(y0!, m0! - 1, d0!));
  const end = new Date(Date.UTC(y1!, m1! - 1, d1!));
  while (cur.getTime() <= end.getTime()) {
    out.push(formatUtcDate(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

function monthEndDatesBetween(fromDate: string, toDate: string): string[] {
  const days = daysBetweenInclusive(fromDate, toDate);
  const byMonth = new Map<string, string>();
  for (const d of days) {
    byMonth.set(d.slice(0, 7), d);
  }
  return [...byMonth.values()].sort();
}

type TxWithEffect = { occurredAt: Date; effect: number };

function buildTransferPairMap(
  rows: TxRowForBalance[],
): Map<string, TxRowForBalance[]> {
  const byPair = new Map<string, TxRowForBalance[]>();
  for (const row of rows) {
    if (row.kind !== "transfer" || !row.transferPairId) continue;
    const arr = byPair.get(row.transferPairId) ?? [];
    arr.push(row);
    byPair.set(row.transferPairId, arr);
  }
  const ordered = new Map<string, TxRowForBalance[]>();
  for (const [pairId, pairRows] of byPair) {
    if (pairRows.length === 2) {
      ordered.set(pairId, sortTransferPairRows(pairRows));
    }
  }
  return ordered;
}

function effectForRow(
  row: TxRowForBalance,
  pairMap: Map<string, TxRowForBalance[]>,
): number {
  const pair =
    row.transferPairId && pairMap.has(row.transferPairId)
      ? pairMap.get(row.transferPairId)!
      : null;
  return effectOnAccount(row, pair);
}

/**
 * Workspace total balance at end of each day (or month-end when range > 90 days).
 * balanceAt(d) = sum(current account balances) - sum(effects of txs after end of d).
 */
export async function buildWorkspaceBalanceSeries(
  workspaceId: string,
  fromISO: string,
  toISO: string,
  accountIds?: string[],
): Promise<BalanceSeriesPoint[]> {
  const fromDate = formatUtcDate(new Date(fromISO));
  const toDate = formatUtcDate(new Date(toISO));

  const accountConditions = [eq(moneyAccount.workspaceId, workspaceId)];
  if (accountIds && accountIds.length > 0) {
    accountConditions.push(inArray(moneyAccount.id, accountIds));
  }

  const accounts = await db
    .select({
      id: moneyAccount.id,
      balanceMinor: moneyAccount.balanceMinor,
    })
    .from(moneyAccount)
    .where(and(...accountConditions));

  if (accounts.length === 0) return [];

  const accountIdSet = new Set(accounts.map((a) => a.id));
  const currentTotal = accounts.reduce((s, a) => s + a.balanceMinor, 0);

  const txRows = await db
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
        inArray(moneyTransaction.accountId, [...accountIdSet]),
      ),
    );

  const balanceRows: TxRowForBalance[] = txRows.map((r) => ({
    id: r.id,
    accountId: r.accountId,
    kind: r.kind as TxRowForBalance["kind"],
    amountMinor: r.amountMinor,
    occurredAt: r.occurredAt,
    createdAt: r.createdAt,
    transferPairId: r.transferPairId,
  }));

  const pairMap = buildTransferPairMap(balanceRows);
  const txsWithEffect: TxWithEffect[] = balanceRows.map((row) => ({
    occurredAt: row.occurredAt,
    effect: effectForRow(row, pairMap),
  }));

  txsWithEffect.sort((a, b) => {
    const t = a.occurredAt.getTime() - b.occurredAt.getTime();
    if (t !== 0) return t;
    return 0;
  });

  const dayCount = daysBetweenInclusive(fromDate, toDate).length;
  const bucketDates =
    dayCount > 90
      ? monthEndDatesBetween(fromDate, toDate)
      : daysBetweenInclusive(fromDate, toDate);

  if (bucketDates.length === 0) return [];

  const points: BalanceSeriesPoint[] = [];
  let futureSum = 0;
  let idx = txsWithEffect.length - 1;

  for (let i = bucketDates.length - 1; i >= 0; i--) {
    const d = bucketDates[i]!;
    const cutoff = endOfUtcDay(d);
    while (idx >= 0 && txsWithEffect[idx]!.occurredAt.getTime() > cutoff.getTime()) {
      futureSum += txsWithEffect[idx]!.effect;
      idx--;
    }
    points.unshift({
      date: d,
      totalMinor: currentTotal - futureSum,
    });
  }

  return points;
}

/** Exported for unit tests. */
export function computeBalanceSeriesFromTxs(
  currentTotal: number,
  txs: { occurredAt: Date; effect: number }[],
  bucketDates: string[],
): BalanceSeriesPoint[] {
  const sorted = [...txs].sort(
    (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
  );
  const points: BalanceSeriesPoint[] = [];
  let futureSum = 0;
  let idx = sorted.length - 1;

  for (let i = bucketDates.length - 1; i >= 0; i--) {
    const d = bucketDates[i]!;
    const cutoff = endOfUtcDay(d);
    while (idx >= 0 && sorted[idx]!.occurredAt.getTime() > cutoff.getTime()) {
      futureSum += sorted[idx]!.effect;
      idx--;
    }
    points.unshift({ date: d, totalMinor: currentTotal - futureSum });
  }

  return points;
}
