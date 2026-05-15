import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  moneyAccount,
  moneyCategory,
  moneyTransaction,
} from "@/db/schema/money";
import { dateRangeParams } from "@/lib/analytics-build-query";
import type { AnalyticsFiltersData } from "@/lib/money-transaction-analytics-conditions";
import {
  moneyTransactionConditionsForAnalytics,
  resolveAnalyticsDateBounds,
} from "@/lib/money-transaction-analytics-conditions";
import {
  calendarMonthDateRange,
  currentMonthSeriesEndDate,
  fillDailyCumulativeNet,
  isoBoundsToLocalDates,
  isCurrentCalendarMonthRange,
  netPointsByDayOfMonth,
  previousCalendarMonth,
  type RawCumulativeLineRow,
} from "@/lib/analytics-line-series";
import {
  listMoneyBudgets,
  type BudgetListRowEnriched,
} from "@/lib/money-services/budgets";

type PieRow = {
  categoryId: string | null;
  label: string;
  valueMinor: number;
};

export type MoneyAnalyticsPayload = {
  pieSpend: PieRow[];
  pieIncome: PieRow[];
  column: { month: string; expenseMinor: number; incomeMinor: number }[];
  line: { date: string; netMinor: number }[];
  lineCompare?: {
    fromDate: string;
    points: { date: string; netMinor: number }[];
  };
  lineMode?: "dayOfMonth" | "date";
  sankey: {
    /** Graph ids: `a:` account, `c:` category, `b:` budget (when budgets apply). */
    nodes: { id: string; name: string }[];
    links: { source: string; target: string; value: number }[];
  };
  stats: {
    expenseMinor: number;
    incomeMinor: number;
    netMinor: number;
    transactionCount: number;
  };
  range: { from: string; to: string };
};

type SankeyLink = { source: string; target: string; value: number };

type CategoryRow = {
  id: string;
  parentId: string | null;
  name: string;
};

function budgetNodeLabel(
  b: BudgetListRowEnriched,
  catName: Map<string, string>,
  accountName: Map<string, string>,
): string {
  switch (b.scopeType) {
    case "workspace":
      return "Budget · Whole workspace";
    case "category":
      return `Budget · ${b.scopeId ? (catName.get(b.scopeId) ?? "Category") : "Category"}`;
    case "account":
      return `Budget · ${b.scopeId ? (accountName.get(b.scopeId) ?? "Account") : "Account"}`;
    case "tag":
      return "Budget · Tag scope";
    default:
      return "Budget";
  }
}

/** Expense links only: every source is `a:…` (account). */
function applyAccountBudgetSplits(
  links: SankeyLink[],
  accountUuidToBudgetId: Map<string, string>,
): SankeyLink[] {
  const outgoingByAccount = new Map<string, SankeyLink[]>();
  for (const l of links) {
    const arr = outgoingByAccount.get(l.source) ?? [];
    arr.push(l);
    outgoingByAccount.set(l.source, arr);
  }
  const result: SankeyLink[] = [];
  for (const [accKey, group] of outgoingByAccount) {
    const accUuid = accKey.slice(2);
    const budgetId = accountUuidToBudgetId.get(accUuid);
    if (!budgetId) {
      result.push(...group);
      continue;
    }
    const total = group.reduce((s, x) => s + x.value, 0);
    if (total <= 0) {
      result.push(...group);
      continue;
    }
    result.push({ source: accKey, target: `b:${budgetId}`, value: total });
    for (const x of group) {
      result.push({ source: `b:${budgetId}`, target: x.target, value: x.value });
    }
  }
  return result;
}

/**
 * After account→category (or account→budget→category) flows, send each category's
 * inflow to the nearest category-scoped budget on the ancestor chain, else the
 * workspace budget if present. Tag-scoped budgets are omitted (no tag axis in this graph).
 */
function appendCategoryBudgetSinks(
  links: SankeyLink[],
  budgets: BudgetListRowEnriched[],
  categories: CategoryRow[],
): SankeyLink[] {
  const inflow = new Map<string, number>();
  for (const l of links) {
    if (!l.target.startsWith("c:")) continue;
    inflow.set(l.target, (inflow.get(l.target) ?? 0) + l.value);
  }

  const categoryScopeToBudgetId = new Map<string, string>();
  let workspaceBudget: BudgetListRowEnriched | undefined;
  for (const b of budgets) {
    if (b.scopeType === "category" && b.scopeId) {
      categoryScopeToBudgetId.set(b.scopeId, b.id);
    }
    if (b.scopeType === "workspace") {
      workspaceBudget = b;
    }
  }

  const parentByChild = new Map<string, string>();
  for (const c of categories) {
    if (c.parentId) parentByChild.set(c.id, c.parentId);
  }

  function nearestCategoryBudgetId(leafPart: string): string | null {
    if (leafPart === "uncategorized") return null;
    let cur: string | undefined = leafPart;
    const seen = new Set<string>();
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      const bid = categoryScopeToBudgetId.get(cur);
      if (bid) return bid;
      cur = parentByChild.get(cur);
    }
    return null;
  }

  const extra: SankeyLink[] = [];
  for (const [catKey, amount] of inflow) {
    if (amount <= 0) continue;
    const idPart = catKey.slice(2);
    const catBudgetId = nearestCategoryBudgetId(idPart);
    if (catBudgetId) {
      extra.push({ source: catKey, target: `b:${catBudgetId}`, value: amount });
    } else if (workspaceBudget) {
      extra.push({
        source: catKey,
        target: `b:${workspaceBudget.id}`,
        value: amount,
      });
    }
  }

  return [...links, ...extra];
}

function augmentExpenseSankeyWithBudgets(
  expenseLinks: SankeyLink[],
  budgets: BudgetListRowEnriched[],
  categories: CategoryRow[],
  accountNameById: Map<string, string>,
  catName: Map<string, string>,
): { links: SankeyLink[]; labelById: Map<string, string> } {
  const labelById = new Map<string, string>();

  const accountUuidToBudgetId = new Map<string, string>();
  for (const b of budgets) {
    if (b.scopeType === "account" && b.scopeId) {
      accountUuidToBudgetId.set(b.scopeId, b.id);
    }
  }

  let links = expenseLinks;
  if (accountUuidToBudgetId.size > 0) {
    links = applyAccountBudgetSplits(links, accountUuidToBudgetId);
  }
  if (
    budgets.some(
      (b) => b.scopeType === "category" || b.scopeType === "workspace",
    )
  ) {
    links = appendCategoryBudgetSinks(links, budgets, categories);
  }

  for (const b of budgets) {
    if (b.scopeType === "tag") continue;
    labelById.set(`b:${b.id}`, budgetNodeLabel(b, catName, accountNameById));
  }

  return { links, labelById };
}

async function fetchCumulativeLine(
  whereClause: ReturnType<typeof and>,
): Promise<RawCumulativeLineRow[]> {
  const lineExec = await db.execute(sql`
      SELECT DISTINCT ON (d)
        to_char(d, 'YYYY-MM-DD') AS date,
        cum_exp AS cumulative_expense,
        cum_inc AS cumulative_income
      FROM (
        SELECT
          (occurred_at AT TIME ZONE 'utc')::date AS d,
          occurred_at,
          id,
          SUM(
            CASE WHEN kind = 'expense' THEN amount_minor ELSE 0 END
          ) OVER (ORDER BY occurred_at ASC, id ASC) AS cum_exp,
          SUM(
            CASE WHEN kind = 'income' THEN amount_minor ELSE 0 END
          ) OVER (ORDER BY occurred_at ASC, id ASC) AS cum_inc
        FROM ${moneyTransaction}
        WHERE ${whereClause}
      ) x
      ORDER BY d, occurred_at DESC, id DESC
    `);

  const lineRaw = lineExec as unknown as Iterable<{
    date: string;
    cumulative_expense: string | bigint | null;
    cumulative_income: string | bigint | null;
  }>;

  return Array.from(lineRaw).map((row) => ({
    date: String(row.date),
    cumulativeExpense: Number(row.cumulative_expense ?? 0),
    cumulativeIncome: Number(row.cumulative_income ?? 0),
  }));
}

function mapRawLineToNet(raw: RawCumulativeLineRow[]): {
  date: string;
  netMinor: number;
}[] {
  return raw.map((row) => ({
    date: row.date,
    netMinor: row.cumulativeIncome - row.cumulativeExpense,
  }));
}

async function buildNetLineSeries(
  workspaceId: string,
  filters: AnalyticsFiltersData,
  fromISO: string,
  toISO: string,
): Promise<{
  line: { date: string; netMinor: number }[];
  lineCompare?: { fromDate: string; points: { date: string; netMinor: number }[] };
  lineMode?: "dayOfMonth" | "date";
}> {
  const { fromDate, toDate } = isoBoundsToLocalDates(fromISO, toISO);

  const conditions = moneyTransactionConditionsForAnalytics(
    workspaceId,
    filters,
  );
  const whereClause = and(...conditions);
  const raw = await fetchCumulativeLine(whereClause);

  if (isCurrentCalendarMonthRange(fromDate, toDate)) {
    const [y, m] = fromDate.split("-").map(Number);
    const { days } = calendarMonthDateRange(y!, m! - 1);
    const seriesEnd = currentMonthSeriesEndDate(toDate);
    const filled = fillDailyCumulativeNet(raw, days, seriesEnd);
    const line = netPointsByDayOfMonth(filled);

    const prev = previousCalendarMonth(fromDate);
    const { from: prevFrom, to: prevTo } = dateRangeParams(
      prev.fromDate,
      prev.toDate,
    );

    const prevFilters: AnalyticsFiltersData = {
      ...filters,
      from: prevFrom,
      to: prevTo,
    };
    const prevConditions = moneyTransactionConditionsForAnalytics(
      workspaceId,
      prevFilters,
    );
    const prevRaw = await fetchCumulativeLine(and(...prevConditions));
    const prevFilled = fillDailyCumulativeNet(prevRaw, prev.days);
    const comparePoints = netPointsByDayOfMonth(prevFilled);

    return {
      line,
      lineCompare: {
        fromDate: prev.fromDate,
        points: comparePoints,
      },
      lineMode: "dayOfMonth",
    };
  }

  return {
    line: mapRawLineToNet(raw),
    lineMode: "date",
  };
}

export async function computeMoneyAnalytics(
  workspaceId: string,
  filters: AnalyticsFiltersData,
): Promise<MoneyAnalyticsPayload> {
  const { fromISO: from, toISO: to } = resolveAnalyticsDateBounds(filters);

  const conditions = moneyTransactionConditionsForAnalytics(
    workspaceId,
    filters,
  );
  const whereClause = and(...conditions);

  const monthExpr = sql`to_char((${moneyTransaction.occurredAt} at time zone 'utc'), 'YYYY-MM')`;

  const sankeyExpenseSql = sql`
      SELECT
        ('a:' || ${moneyTransaction.accountId}::text) as source_id,
        ('c:' || coalesce(${moneyTransaction.categoryId}::text, 'uncategorized')) as target_id,
        coalesce(${moneyAccount.name}, 'Account') as source_label,
        coalesce(${moneyCategory.name}, 'Uncategorized') as target_label,
        coalesce(sum(${moneyTransaction.amountMinor}), 0) as value_minor
      FROM ${moneyTransaction}
      INNER JOIN ${moneyAccount} ON ${moneyTransaction.accountId} = ${moneyAccount.id}
      LEFT JOIN ${moneyCategory} ON ${moneyTransaction.categoryId} = ${moneyCategory.id}
      WHERE ${whereClause} AND ${moneyTransaction.kind} = 'expense'
      GROUP BY ${moneyTransaction.accountId}, ${moneyAccount.name}, ${moneyTransaction.categoryId}, ${moneyCategory.name}
    `;
  const sankeyIncomeSql = sql`
      SELECT
        ('c:' || coalesce(${moneyTransaction.categoryId}::text, 'uncategorized')) as source_id,
        ('a:' || ${moneyTransaction.accountId}::text) as target_id,
        coalesce(${moneyCategory.name}, 'Uncategorized') as source_label,
        coalesce(${moneyAccount.name}, 'Account') as target_label,
        coalesce(sum(${moneyTransaction.amountMinor}), 0) as value_minor
      FROM ${moneyTransaction}
      INNER JOIN ${moneyAccount} ON ${moneyTransaction.accountId} = ${moneyAccount.id}
      LEFT JOIN ${moneyCategory} ON ${moneyTransaction.categoryId} = ${moneyCategory.id}
      WHERE ${whereClause} AND ${moneyTransaction.kind} = 'income'
      GROUP BY ${moneyTransaction.accountId}, ${moneyAccount.name}, ${moneyTransaction.categoryId}, ${moneyCategory.name}
    `;

  const [
    categories,
    accountRows,
    budgetRowsResolved,
    statRows,
    pieSpendRows,
    pieIncomeRows,
    columnRows,
    sankeyExec,
    lineExec,
  ] = await Promise.all([
      db
        .select()
        .from(moneyCategory)
        .where(eq(moneyCategory.workspaceId, workspaceId)),
      db
        .select({ id: moneyAccount.id, name: moneyAccount.name })
        .from(moneyAccount)
        .where(eq(moneyAccount.workspaceId, workspaceId)),
      listMoneyBudgets(workspaceId, {
        includeSpent: true,
        from,
        to,
      }),
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
          categoryId: moneyTransaction.categoryId,
          valueMinor: sql<string>`coalesce(sum(${moneyTransaction.amountMinor}), 0)`,
        })
        .from(moneyTransaction)
        .where(and(whereClause, eq(moneyTransaction.kind, "income")))
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
      db.execute(sql`${sankeyExpenseSql} UNION ALL ${sankeyIncomeSql}`),
    ]);

  const budgetRows = budgetRowsResolved as BudgetListRowEnriched[];
  const accountNameById = new Map(accountRows.map((a) => [a.id, a.name]));

  const catName = new Map(categories.map((c) => [c.id, c.name]));

  const stat = statRows[0];
  const expenseMinorTotal = Number(stat?.expenseMinor ?? 0);
  const incomeMinorTotal = Number(stat?.incomeMinor ?? 0);
  const netMinorTotal = incomeMinorTotal - expenseMinorTotal;
  const transactionCount = Number(stat?.transactionCount ?? 0);

  const buildPie = (
    rows: { categoryId: string | null; valueMinor: string }[],
  ): PieRow[] =>
    rows.map((row) => {
      const categoryId = row.categoryId;
      const valueMinor = Number(row.valueMinor);
      if (categoryId == null) {
        return {
          categoryId: null,
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

  const pieSpend = buildPie(pieSpendRows);
  const pieIncome = buildPie(pieIncomeRows);

  const column = columnRows.map((row) => ({
    month: String(row.month),
    expenseMinor: Number(row.expenseMinor),
    incomeMinor: Number(row.incomeMinor),
  }));

  const sankeyRowsRaw = sankeyExec as unknown as Iterable<{
    source_id: string;
    target_id: string;
    source_label: string;
    target_label: string;
    value_minor: string | number | bigint | null;
  }>;
  const labelById = new Map<string, string>();
  const expenseLinks: SankeyLink[] = [];
  const incomeLinks: SankeyLink[] = [];

  for (const row of sankeyRowsRaw) {
    const source = String(row.source_id);
    const target = String(row.target_id);
    const value = Number(row.value_minor ?? 0);
    if (value <= 0) continue;
    labelById.set(source, String(row.source_label));
    labelById.set(target, String(row.target_label));
    const link: SankeyLink = { source, target, value };
    if (source.startsWith("a:") && target.startsWith("c:")) {
      expenseLinks.push(link);
    } else if (source.startsWith("c:") && target.startsWith("a:")) {
      incomeLinks.push(link);
    }
  }

  const categoryRowsForSankey: CategoryRow[] = categories.map((c) => ({
    id: c.id,
    parentId: c.parentId ?? null,
    name: c.name,
  }));

  const augmented = augmentExpenseSankeyWithBudgets(
    expenseLinks,
    budgetRows,
    categoryRowsForSankey,
    accountNameById,
    catName,
  );
  for (const [id, name] of augmented.labelById) {
    labelById.set(id, name);
  }

  const allSankeyLinks: SankeyLink[] = [...augmented.links, ...incomeLinks];
  const nodeIds = new Set<string>();
  for (const l of allSankeyLinks) {
    nodeIds.add(l.source);
    nodeIds.add(l.target);
  }
  const sankey = {
    nodes: [...nodeIds].map((id) => ({ id, name: labelById.get(id) ?? id })),
    links: allSankeyLinks,
  };

  const { line, lineCompare, lineMode } = await buildNetLineSeries(
    workspaceId,
    filters,
    from,
    to,
  );

  return {
    pieSpend,
    pieIncome,
    column,
    line,
    lineCompare,
    lineMode,
    sankey,
    stats: {
      expenseMinor: expenseMinorTotal,
      incomeMinor: incomeMinorTotal,
      netMinor: netMinorTotal,
      transactionCount,
    },
    range: { from, to },
  };
}
