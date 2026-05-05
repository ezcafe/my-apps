import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  moneyAccount,
  moneyCategory,
  moneyTransaction,
} from "@/db/schema/money";
import { badRequest, requireMoneyContext } from "@/lib/api-money";
import {
  analyticsFiltersFromUrl,
  moneyTransactionConditionsForAnalytics,
  resolveAnalyticsDateBounds,
} from "@/lib/money-transaction-analytics-conditions";

function signedAmount(kind: string, amountMinor: number): number {
  if (kind === "income") return amountMinor;
  if (kind === "expense") return -amountMinor;
  return 0;
}

export async function GET(req: Request) {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  const url = new URL(req.url);
  const parsed = analyticsFiltersFromUrl(url);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") ||
        "Invalid filters",
    );
  }

  const filters = parsed.data;
  const { fromISO: from, toISO: to } = resolveAnalyticsDateBounds(filters);

  const conditions = moneyTransactionConditionsForAnalytics(
    ctx.workspaceId,
    filters,
  );

  const txs = await db
    .select()
    .from(moneyTransaction)
    .where(and(...conditions));

  const categories = await db
    .select()
    .from(moneyCategory)
    .where(eq(moneyCategory.workspaceId, ctx.workspaceId));

  const accounts = await db
    .select()
    .from(moneyAccount)
    .where(eq(moneyAccount.workspaceId, ctx.workspaceId));

  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const accName = new Map(accounts.map((a) => [a.id, a.name]));

  const pieMap = new Map<string, number>();
  const monthMap = new Map<string, { expense: number; income: number }>();
  const sankeyAgg = new Map<string, number>();

  const linePoints: { date: string; cumulative: number }[] = [];
  let cumulative = 0;

  let expenseMinorTotal = 0;
  let incomeMinorTotal = 0;
  for (const tx of txs) {
    if (tx.kind === "expense") expenseMinorTotal += tx.amountMinor;
    if (tx.kind === "income") incomeMinorTotal += tx.amountMinor;
  }
  const netMinorTotal = incomeMinorTotal - expenseMinorTotal;

  const sorted = [...txs].sort(
    (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
  );

  for (const tx of sorted) {
    const day = tx.occurredAt.toISOString().slice(0, 10);
    const sa = signedAmount(tx.kind, tx.amountMinor);
    cumulative += sa;
    linePoints.push({ date: day, cumulative });

    if (tx.kind === "expense") {
      const ckey = tx.categoryId ?? "uncategorized";
      pieMap.set(ckey, (pieMap.get(ckey) ?? 0) + tx.amountMinor);

      const mkey = `${tx.occurredAt.getUTCFullYear()}-${String(tx.occurredAt.getUTCMonth() + 1).padStart(2, "0")}`;
      const cur = monthMap.get(mkey) ?? { expense: 0, income: 0 };
      cur.expense += tx.amountMinor;
      monthMap.set(mkey, cur);

      const source = accName.get(tx.accountId) ?? "Account";
      const target =
        (tx.categoryId ? catName.get(tx.categoryId) : null) ??
        "Uncategorized";
      const sk = `${source}|${target}`;
      sankeyAgg.set(sk, (sankeyAgg.get(sk) ?? 0) + tx.amountMinor);
    }

    if (tx.kind === "income") {
      const mkey = `${tx.occurredAt.getUTCFullYear()}-${String(tx.occurredAt.getUTCMonth() + 1).padStart(2, "0")}`;
      const cur = monthMap.get(mkey) ?? { expense: 0, income: 0 };
      cur.income += tx.amountMinor;
      monthMap.set(mkey, cur);
    }
  }

  const pie = [...pieMap.entries()].map(([categoryId, valueMinor]) => ({
    categoryId: categoryId === "uncategorized" ? null : categoryId,
    label:
      categoryId === "uncategorized"
        ? "Uncategorized"
        : (catName.get(categoryId) ?? categoryId),
    valueMinor,
  }));

  const column = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      expenseMinor: v.expense,
      incomeMinor: v.income,
    }));

  const sankeyNodesSet = new Set<string>();
  const sankeyLinks: { source: string; target: string; value: number }[] = [];
  for (const [key, value] of sankeyAgg.entries()) {
    const [source, target] = key.split("|");
    sankeyNodesSet.add(source);
    sankeyNodesSet.add(target);
    sankeyLinks.push({ source, target, value });
  }

  const sankey = {
    nodes: [...sankeyNodesSet].map((name) => ({ name })),
    links: sankeyLinks,
  };

  const lineByDay = new Map<string, number>();
  for (const p of linePoints) {
    lineByDay.set(p.date, p.cumulative);
  }
  const line = [...lineByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cumulative]) => ({ date, cumulative }));

  return NextResponse.json({
    data: {
      pie,
      column,
      line,
      sankey,
      stats: {
        expenseMinor: expenseMinorTotal,
        incomeMinor: incomeMinorTotal,
        netMinor: netMinorTotal,
        transactionCount: txs.length,
      },
      range: { from, to },
    },
  });
}
