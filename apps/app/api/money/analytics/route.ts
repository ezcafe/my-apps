import { and, eq, sql } from "drizzle-orm";
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
  const whereClause = and(...conditions);

  const monthExpr = sql`to_char((${moneyTransaction.occurredAt} at time zone 'utc'), 'YYYY-MM')`;

  const [categories, statRows, pieRows, columnRows, sankeyRows, lineExec] =
    await Promise.all([
    db
      .select()
      .from(moneyCategory)
      .where(eq(moneyCategory.workspaceId, ctx.workspaceId)),
    db
      .select({
        transactionCount: sql<number>`count(*)::int`,
        expenseMinor: sql<string>`coalesce(sum(case when ${moneyTransaction.kind} = 'expense' then ${moneyTransaction.amountMinor} else 0 end), 0)`,
        incomeMinor: sql<string>`coalesce(sum(case when ${moneyTransaction.kind} = 'income' then ${moneyTransaction.amountMinor} else 0 end), 0)`,
      })
      .from(moneyTransaction)
      .where(whereClause),
    db
      .select({
        categoryId: moneyTransaction.categoryId,
        valueMinor: sql<string>`coalesce(sum(${moneyTransaction.amountMinor}), 0)`,
      })
      .from(moneyTransaction)
      .where(and(whereClause, eq(moneyTransaction.kind, "expense")))
      .groupBy(moneyTransaction.categoryId),
    db
      .select({
        month: monthExpr,
        expenseMinor: sql<string>`coalesce(sum(case when ${moneyTransaction.kind} = 'expense' then ${moneyTransaction.amountMinor} else 0 end), 0)`,
        incomeMinor: sql<string>`coalesce(sum(case when ${moneyTransaction.kind} = 'income' then ${moneyTransaction.amountMinor} else 0 end), 0)`,
      })
      .from(moneyTransaction)
      .where(whereClause)
      .groupBy(monthExpr)
      .orderBy(monthExpr),
    db
      .select({
        source: sql<string>`coalesce(${moneyAccount.name}, 'Account')`,
        target: sql<string>`coalesce(${moneyCategory.name}, 'Uncategorized')`,
        valueMinor: sql<string>`coalesce(sum(${moneyTransaction.amountMinor}), 0)`,
      })
      .from(moneyTransaction)
      .innerJoin(moneyAccount, eq(moneyTransaction.accountId, moneyAccount.id))
      .leftJoin(
        moneyCategory,
        eq(moneyTransaction.categoryId, moneyCategory.id),
      )
      .where(and(whereClause, eq(moneyTransaction.kind, "expense")))
      .groupBy(
        moneyTransaction.accountId,
        moneyAccount.name,
        moneyTransaction.categoryId,
        moneyCategory.name,
      ),
    db.execute(sql`
      SELECT DISTINCT ON (d)
        to_char(d, 'YYYY-MM-DD') AS date,
        c AS cumulative
      FROM (
        SELECT
          (occurred_at AT TIME ZONE 'utc')::date AS d,
          occurred_at,
          id,
          SUM(
            CASE kind
              WHEN 'income' THEN amount_minor
              WHEN 'expense' THEN -amount_minor
              ELSE 0
            END
          ) OVER (ORDER BY occurred_at ASC, id ASC) AS c
        FROM ${moneyTransaction}
        WHERE ${whereClause}
      ) x
      ORDER BY d, occurred_at DESC, id DESC
    `),
  ]);

  const catName = new Map(categories.map((c) => [c.id, c.name]));

  const stat = statRows[0];
  const expenseMinorTotal = Number(stat?.expenseMinor ?? 0);
  const incomeMinorTotal = Number(stat?.incomeMinor ?? 0);
  const netMinorTotal = incomeMinorTotal - expenseMinorTotal;
  const transactionCount = Number(stat?.transactionCount ?? 0);

  const pie = pieRows.map((row) => {
    const categoryId = row.categoryId;
    const valueMinor = Number(row.valueMinor);
    if (categoryId == null) {
      return {
        categoryId: null as string | null,
        label: "Uncategorized",
        valueMinor,
      };
    }
    return {
      categoryId,
      label: catName.get(categoryId) ?? categoryId,
      valueMinor,
    };
  });

  const column = columnRows.map((row) => ({
    month: String(row.month),
    expenseMinor: Number(row.expenseMinor),
    incomeMinor: Number(row.incomeMinor),
  }));

  const sankeyNodesSet = new Set<string>();
  const sankeyLinks: { source: string; target: string; value: number }[] = [];
  for (const row of sankeyRows) {
    const source = String(row.source);
    const target = String(row.target);
    const value = Number(row.valueMinor);
    if (value <= 0) continue;
    sankeyNodesSet.add(source);
    sankeyNodesSet.add(target);
    sankeyLinks.push({ source, target, value });
  }
  const sankey = {
    nodes: [...sankeyNodesSet].map((name) => ({ name })),
    links: sankeyLinks,
  };

  const lineRaw = lineExec as unknown as Iterable<{
    date: string;
    cumulative: string | bigint | null;
  }>;
  const line = Array.from(lineRaw).map((row) => ({
    date: String(row.date),
    cumulative: Number(row.cumulative ?? 0),
  }));

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
        transactionCount,
      },
      range: { from, to },
    },
  });
}
