import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  moneyCategory,
  moneyMerchant,
  moneyRecurrentTemplate,
  moneyTag,
  moneyTransaction,
  moneyTransactionTag,
} from "@/db/schema/money";
import { workspace } from "@/db/schema/workspace";
import {
  rollupCategoryByMonth,
  type StackedMonthSeries,
} from "@/lib/analytics-category-rollup";
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
  moneyCategoryById,
  moneyCategoryLabel,
  type MoneyCategoryKind,
} from "@/lib/money-category-ui";
import {
  listMoneyBudgets,
  type BudgetListRowEnriched,
} from "@/lib/money-services/budgets";
import { getOrCreate } from "@/lib/money-services/_loaders";

type MoneyServiceLoaders = Map<string, Promise<unknown>> | undefined;

async function loadWorkspaceCategories(
  workspaceId: string,
  loaders?: MoneyServiceLoaders,
) {
  if (loaders) {
    return getOrCreate(loaders, `categories:${workspaceId}`, () =>
      db
        .select()
        .from(moneyCategory)
        .where(eq(moneyCategory.workspaceId, workspaceId)),
    );
  }
  return db
    .select()
    .from(moneyCategory)
    .where(eq(moneyCategory.workspaceId, workspaceId));
}

async function loadWorkspaceBudgets(
  workspaceId: string,
  from: string,
  to: string,
  loaders?: MoneyServiceLoaders,
) {
  if (loaders) {
    return getOrCreate(
      loaders,
      `budgets:${workspaceId}:${from}:${to}`,
      () =>
        listMoneyBudgets(workspaceId, {
          includeSpent: true,
          from,
          to,
        }),
    );
  }
  return listMoneyBudgets(workspaceId, {
    includeSpent: true,
    from,
    to,
  });
}

async function loadWorkspaceTimezone(
  workspaceId: string,
  loaders?: MoneyServiceLoaders,
): Promise<string> {
  const load = async () => {
    const [row] = await db
      .select({ tzName: workspace.tzName })
      .from(workspace)
      .where(eq(workspace.id, workspaceId))
      .limit(1);
    return row?.tzName ?? "UTC";
  };
  if (loaders) {
    return getOrCreate(loaders, `workspace-tz:${workspaceId}`, load);
  }
  return load();
}

type PieRow = {
  categoryId: string | null;
  label: string;
  valueMinor: number;
};

export type LabelValueRow = { label: string; valueMinor: number };

export type RecurringSpendRow = {
  label: string;
  valueMinor: number;
  templateId: string | null;
};

export type MoneyAnalyticsSummaryPayload = {
  stats: {
    expenseMinor: number;
    incomeMinor: number;
    netMinor: number;
    transactionCount: number;
    savingsRatePct: number | null;
  };
  range: { from: string; to: string };
};

export type MoneyAnalyticsOverviewPayload = {
  column: { month: string; expenseMinor: number; incomeMinor: number }[];
  line: { date: string; netMinor: number }[];
  lineCompare?: {
    fromDate: string;
    points: { date: string; netMinor: number }[];
  };
  lineMode?: "dayOfMonth" | "date";
};

export type MoneyAnalyticsDistributionPayload = {
  pieSpend: PieRow[];
  pieIncome: PieRow[];
  categoryByMonthStacked: StackedMonthSeries[];
};

export type MoneyAnalyticsBudgetPayload = {
  budgets: BudgetListRowEnriched[];
};

export type MoneyAnalyticsSankeyPayload = {
  sankey: {
    nodes: {
      id: string;
      name: string;
      value?: number;
      percentage?: number;
      color?: string;
    }[];
    links: {
      source: string;
      target: string;
      value: number;
      percentage?: number;
      color?: string;
    }[];
  };
};

export type MoneyAnalyticsLeadersPayload = {
  merchantsSpend: LabelValueRow[];
  tagsSpend: LabelValueRow[];
  recurringSpend: RecurringSpendRow[];
};

type SankeyNode = {
  id: string;
  name: string;
  value?: number;
  percentage?: number;
  color?: string;
};

type CategoryRow = {
  id: string;
  parentId: string | null;
  name: string;
};

function buildCategoryLabelMap(
  categories: CategoryRow[],
): Map<string, string> {
  const rows = categories.map((c) => ({
    id: c.id,
    name: c.name,
    kind: "expense" as MoneyCategoryKind,
    parentId: c.parentId,
  }));
  const byId = moneyCategoryById(rows);
  return new Map(rows.map((c) => [c.id, moneyCategoryLabel(c, byId)]));
}

/** `c:` graph ids use parent:child labels; other ids keep the SQL label. */
function sankeyNodeLabel(
  nodeId: string,
  sqlLabel: string,
  categoryLabels: Map<string, string>,
): string {
  if (!nodeId.startsWith("c:")) return sqlLabel;
  const catId = nodeId.slice(2);
  if (catId === "uncategorized") return "Uncategorized";
  return categoryLabels.get(catId) ?? sqlLabel;
}

type SankeyCategoryNet = {
  id: string;
  parentId: string | null;
  name: string;
  color: string | null;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
};

function buildSankeyCategoryNet(
  categories: {
    id: string;
    parentId: string | null;
    name: string;
    color: string | null;
  }[],
  totalsByCategory: Map<string, { incomeMinor: number; expenseMinor: number }>,
): SankeyCategoryNet[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const out: SankeyCategoryNet[] = [];
  for (const c of categories) {
    const t = totalsByCategory.get(c.id);
    const incomeMinor = t?.incomeMinor ?? 0;
    const expenseMinor = t?.expenseMinor ?? 0;
    out.push({
      id: c.id,
      parentId: c.parentId,
      name: c.name,
      color: c.color ?? null,
      incomeMinor,
      expenseMinor,
      netMinor: incomeMinor - expenseMinor,
    });
  }
  if (!byId.has("uncategorized") && totalsByCategory.has("uncategorized")) {
    const uncategorized = totalsByCategory.get("uncategorized");
    out.push({
      id: "uncategorized",
      parentId: null,
      name: "Uncategorized",
      color: null,
      incomeMinor: uncategorized?.incomeMinor ?? 0,
      expenseMinor: uncategorized?.expenseMinor ?? 0,
      netMinor:
        (uncategorized?.incomeMinor ?? 0) - (uncategorized?.expenseMinor ?? 0),
    });
  }
  return out;
}

export type MoneyAnalyticsSankeyInputRow = {
  kind: "income" | "expense";
  categoryId: string | null;
  valueMinor: number;
};

export function buildNetCashflowSankeyData(
  categories: {
    id: string;
    parentId: string | null;
    name: string;
    color: string | null;
  }[],
  rows: MoneyAnalyticsSankeyInputRow[],
): MoneyAnalyticsSankeyPayload {
  const categoryRowsForSankey: CategoryRow[] = categories.map((category) => ({
    id: category.id,
    parentId: category.parentId ?? null,
    name: category.name,
  }));
  const categoryLabels = buildCategoryLabelMap(categoryRowsForSankey);
  const totalsByCategory = new Map<
    string,
    { incomeMinor: number; expenseMinor: number }
  >();
  let totalIncomeMinor = 0;
  let totalExpenseMinor = 0;

  for (const row of rows) {
    const categoryKey = String(row.categoryId ?? "uncategorized");
    const value = Number(row.valueMinor ?? 0);
    if (value <= 0) continue;
    const bucket = totalsByCategory.get(categoryKey) ?? {
      incomeMinor: 0,
      expenseMinor: 0,
    };
    if (row.kind === "income") {
      bucket.incomeMinor += value;
      totalIncomeMinor += value;
    } else {
      bucket.expenseMinor += value;
      totalExpenseMinor += value;
    }
    totalsByCategory.set(categoryKey, bucket);
  }

  const netCategories = buildSankeyCategoryNet(categories, totalsByCategory);
  const netById = new Map(netCategories.map((c) => [c.id, c] as const));
  const nodes: SankeyNode[] = [];
  const links: MoneyAnalyticsSankeyPayload["sankey"]["links"] = [];
  const nodeIds = new Set<string>();

  function sidePercentage(value: number, direction: "income" | "expense"): number {
    const denom = direction === "income" ? totalIncomeMinor : totalExpenseMinor;
    if (denom <= 0 || value <= 0) return 0;
    return Math.round((value / denom) * 1000) / 10;
  }

  function addNode(
    id: string,
    name: string,
    value: number,
    direction: "income" | "expense",
    color?: string | null,
  ) {
    if (nodeIds.has(id)) return;
    nodeIds.add(id);
    nodes.push({
      id,
      name,
      value,
      percentage: sidePercentage(value, direction),
      color: color ?? undefined,
    });
  }

  function addLink(
    source: string,
    target: string,
    value: number,
    direction: "income" | "expense",
    color?: string | null,
  ) {
    links.push({
      source,
      target,
      value,
      percentage: sidePercentage(value, direction),
      color: color ?? undefined,
    });
  }

  const cashFlowNodeId = "cash_flow_node";
  const cashFlowValue = Math.max(totalIncomeMinor, totalExpenseMinor);
  nodes.push({
    id: cashFlowNodeId,
    name: "Cash Flow",
    value: cashFlowValue,
    percentage: 100,
    color: "var(--chart-income)",
  });
  nodeIds.add(cashFlowNodeId);

  for (const category of netCategories) {
    if (category.netMinor <= 0) continue;
    const value = category.netMinor;
    const parent = category.parentId ? netById.get(category.parentId) : null;
    const categoryLabel = sankeyNodeLabel(
      `c:${category.id}`,
      category.name,
      categoryLabels,
    );
    const categoryNodeId = `income_${category.id}`;
    addNode(categoryNodeId, categoryLabel, value, "income", category.color);

    if (parent && parent.netMinor > 0) {
      const parentValue = parent.netMinor;
      const parentLabel = sankeyNodeLabel(
        `c:${parent.id}`,
        parent.name,
        categoryLabels,
      );
      const parentNodeId = `income_${parent.id}`;
      addNode(parentNodeId, parentLabel, parentValue, "income", parent.color);
      addLink(
        categoryNodeId,
        parentNodeId,
        value,
        "income",
        category.color ?? parent.color,
      );
    } else {
      addLink(
        categoryNodeId,
        cashFlowNodeId,
        value,
        "income",
        category.color,
      );
    }
  }

  for (const category of netCategories) {
    if (category.netMinor >= 0) continue;
    const value = Math.abs(category.netMinor);
    const parent = category.parentId ? netById.get(category.parentId) : null;
    const categoryLabel = sankeyNodeLabel(
      `c:${category.id}`,
      category.name,
      categoryLabels,
    );
    const categoryNodeId = `expense_${category.id}`;
    addNode(categoryNodeId, categoryLabel, value, "expense", category.color);

    if (parent && parent.netMinor < 0) {
      const parentValue = Math.abs(parent.netMinor);
      const parentLabel = sankeyNodeLabel(
        `c:${parent.id}`,
        parent.name,
        categoryLabels,
      );
      const parentNodeId = `expense_${parent.id}`;
      addNode(parentNodeId, parentLabel, parentValue, "expense", parent.color);
      addLink(
        parentNodeId,
        categoryNodeId,
        value,
        "expense",
        category.color ?? parent.color,
      );
    } else {
      addLink(
        cashFlowNodeId,
        categoryNodeId,
        value,
        "expense",
        category.color,
      );
    }
  }

  const surplus = totalIncomeMinor - totalExpenseMinor;
  if (surplus > 0) {
    const surplusId = "surplus_node";
    nodes.push({
      id: surplusId,
      name: "Surplus",
      value: surplus,
      percentage: sidePercentage(surplus, "income"),
      color: "var(--chart-income)",
    });
    links.push({
      source: cashFlowNodeId,
      target: surplusId,
      value: surplus,
      percentage: sidePercentage(surplus, "income"),
      color: "var(--chart-income)",
    });
  }

  return { sankey: { nodes, links } };
}

async function fetchCumulativeLine(
  whereClause: ReturnType<typeof and>,
  timezone: string,
): Promise<RawCumulativeLineRow[]> {
  const lineExec = await db.execute(sql`
      WITH daily AS (
        SELECT
          (occurred_at AT TIME ZONE ${timezone})::date AS d,
          SUM(CASE WHEN kind = 'expense' THEN amount_minor ELSE 0 END) AS day_exp,
          SUM(CASE WHEN kind = 'income' THEN amount_minor ELSE 0 END) AS day_inc
        FROM ${moneyTransaction}
        WHERE ${whereClause}
        GROUP BY 1
      )
      SELECT
        to_char(d, 'YYYY-MM-DD') AS date,
        SUM(day_exp) OVER (ORDER BY d ASC) AS cumulative_expense,
        SUM(day_inc) OVER (ORDER BY d ASC) AS cumulative_income
      FROM daily
      ORDER BY d ASC
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
  timezone: string,
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

  if (isCurrentCalendarMonthRange(fromDate, toDate)) {
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

    const [raw, prevRaw] = await Promise.all([
      fetchCumulativeLine(whereClause, timezone),
      fetchCumulativeLine(and(...prevConditions), timezone),
    ]);

    const [y, m] = fromDate.split("-").map(Number);
    const { days } = calendarMonthDateRange(y!, m! - 1);
    const seriesEnd = currentMonthSeriesEndDate(toDate);
    const filled = fillDailyCumulativeNet(raw, days, seriesEnd);
    const line = netPointsByDayOfMonth(filled);
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

  const raw = await fetchCumulativeLine(whereClause, timezone);
  return {
    line: mapRawLineToNet(raw),
    lineMode: "date",
  };
}

export async function computeMoneyAnalyticsSummary(
  workspaceId: string,
  filters: AnalyticsFiltersData,
): Promise<MoneyAnalyticsSummaryPayload> {
  const { fromISO: from, toISO: to } = resolveAnalyticsDateBounds(filters);

  const conditions = moneyTransactionConditionsForAnalytics(
    workspaceId,
    filters,
  );
  const whereClause = and(...conditions);

  const statRows = await db
    .select({
      transactionCount: sql<number>`count(*)::int`,
      expenseMinor: sql<string>`coalesce(sum(case when ${moneyTransaction.kind} = 'expense' then ${moneyTransaction.amountMinor} else 0 end), 0)`,
      incomeMinor: sql<string>`coalesce(sum(case when ${moneyTransaction.kind} = 'income' then ${moneyTransaction.amountMinor} else 0 end), 0)`,
    })
    .from(moneyTransaction)
    .where(whereClause);

  const stat = statRows[0];
  const expenseMinorTotal = Number(stat?.expenseMinor ?? 0);
  const incomeMinorTotal = Number(stat?.incomeMinor ?? 0);
  const netMinorTotal = incomeMinorTotal - expenseMinorTotal;
  const transactionCount = Number(stat?.transactionCount ?? 0);
  const savingsRatePct =
    incomeMinorTotal > 0
      ? Math.round(((incomeMinorTotal - expenseMinorTotal) / incomeMinorTotal) * 1000) /
        10
      : null;

  return {
    stats: {
      expenseMinor: expenseMinorTotal,
      incomeMinor: incomeMinorTotal,
      netMinor: netMinorTotal,
      transactionCount,
      savingsRatePct,
    },
    range: { from, to },
  };
}

export async function computeMoneyAnalyticsOverview(
  workspaceId: string,
  filters: AnalyticsFiltersData,
): Promise<MoneyAnalyticsOverviewPayload> {
  const { fromISO: from, toISO: to } = resolveAnalyticsDateBounds(filters);
  const timezone = await loadWorkspaceTimezone(workspaceId);

  const conditions = moneyTransactionConditionsForAnalytics(
    workspaceId,
    filters,
  );
  const whereClause = and(...conditions);

  const monthExpr = sql<string>`to_char((${moneyTransaction.occurredAt} at time zone ${timezone}), 'YYYY-MM')`;
  const [columnRows, lineResult] = await Promise.all([
    db
      .select({
        month: monthExpr,
        expenseMinor: sql<string>`coalesce(sum(case when ${moneyTransaction.kind} = 'expense' then ${moneyTransaction.amountMinor} else 0 end), 0)`,
        incomeMinor: sql<string>`coalesce(sum(case when ${moneyTransaction.kind} = 'income' then ${moneyTransaction.amountMinor} else 0 end), 0)`,
      })
      .from(moneyTransaction)
      .where(whereClause)
      .groupBy(sql`1`)
      .orderBy(sql`1`),
    buildNetLineSeries(workspaceId, filters, from, to, timezone),
  ]);

  return {
    column: columnRows.map((row) => ({
      month: String(row.month),
      expenseMinor: Number(row.expenseMinor),
      incomeMinor: Number(row.incomeMinor),
    })),
    line: lineResult.line,
    lineCompare: lineResult.lineCompare,
    lineMode: lineResult.lineMode,
  };
}

export async function computeMoneyAnalyticsDistribution(
  workspaceId: string,
  filters: AnalyticsFiltersData,
  loaders?: MoneyServiceLoaders,
): Promise<MoneyAnalyticsDistributionPayload> {
  const timezone = await loadWorkspaceTimezone(workspaceId, loaders);
  const conditions = moneyTransactionConditionsForAnalytics(
    workspaceId,
    filters,
  );
  const whereClause = and(...conditions);
  const monthExpr = sql<string>`to_char((${moneyTransaction.occurredAt} at time zone ${timezone}), 'YYYY-MM')`;

  const [categories, pieSpendRows, pieIncomeRows, categoryByMonthRows] =
    await Promise.all([
      loadWorkspaceCategories(workspaceId, loaders),
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
          categoryId: moneyTransaction.categoryId,
          valueMinor: sql<string>`coalesce(sum(${moneyTransaction.amountMinor}), 0)`,
        })
        .from(moneyTransaction)
        .where(and(whereClause, eq(moneyTransaction.kind, "expense")))
        .groupBy(sql`1`, moneyTransaction.categoryId)
        .orderBy(sql`1`),
    ]);

  const catName = new Map(categories.map((category) => [category.id, category.name]));
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

  const categoryByMonthRaw = categoryByMonthRows.map((row) => {
    const categoryId = row.categoryId;
    const valueMinor = Number(row.valueMinor);
    if (categoryId == null) {
      return {
        month: String(row.month),
        categoryId: null,
        label: "Uncategorized",
        expenseMinor: valueMinor,
      };
    }
    return {
      month: String(row.month),
      categoryId,
      label: catName.get(categoryId) ?? categoryId,
      expenseMinor: valueMinor,
    };
  });

  return {
    pieSpend: buildPie(pieSpendRows),
    pieIncome: buildPie(pieIncomeRows),
    categoryByMonthStacked: rollupCategoryByMonth(categoryByMonthRaw),
  };
}

export async function computeMoneyAnalyticsBudgets(
  workspaceId: string,
  filters: AnalyticsFiltersData,
  loaders?: MoneyServiceLoaders,
): Promise<MoneyAnalyticsBudgetPayload> {
  const { fromISO: from, toISO: to } = resolveAnalyticsDateBounds(filters);
  const budgets = await loadWorkspaceBudgets(workspaceId, from, to, loaders);

  return {
    budgets: budgets as BudgetListRowEnriched[],
  };
}

export async function computeMoneyAnalyticsSankey(
  workspaceId: string,
  filters: AnalyticsFiltersData,
  loaders?: MoneyServiceLoaders,
): Promise<MoneyAnalyticsSankeyPayload> {
  const conditions = moneyTransactionConditionsForAnalytics(
    workspaceId,
    filters,
  );
  const whereClause = and(...conditions);
  const sankeySql = sql`
      SELECT
        ${moneyTransaction.kind} as kind,
        ${moneyTransaction.categoryId} as category_id,
        coalesce(sum(${moneyTransaction.amountMinor}), 0) as value_minor
      FROM ${moneyTransaction}
      LEFT JOIN ${moneyCategory} ON ${moneyTransaction.categoryId} = ${moneyCategory.id}
      WHERE ${whereClause}
        AND ${moneyTransaction.kind} IN ('expense', 'income')
      GROUP BY
        ${moneyTransaction.kind},
        ${moneyTransaction.categoryId}
    `;

  const [categories, sankeyExec] = await Promise.all([
    loadWorkspaceCategories(workspaceId, loaders),
    db.execute(sankeySql),
  ]);
  const sankeyRowsRaw = sankeyExec as unknown as Iterable<{
    kind: string;
    category_id: string | null;
    value_minor: string | number | bigint | null;
  }>;
  return buildNetCashflowSankeyData(
    categories.map((category) => ({
      id: category.id,
      parentId: category.parentId ?? null,
      name: category.name,
      color: category.color ?? null,
    })),
    Array.from(sankeyRowsRaw).map((row) => ({
      kind: row.kind === "income" ? "income" : "expense",
      categoryId: row.category_id,
      valueMinor: Number(row.value_minor ?? 0),
    })),
  );
}

export async function computeMoneyAnalyticsLeaders(
  workspaceId: string,
  filters: AnalyticsFiltersData,
): Promise<MoneyAnalyticsLeadersPayload> {
  const conditions = moneyTransactionConditionsForAnalytics(
    workspaceId,
    filters,
  );
  const whereClause = and(...conditions);
  const expenseWhere = and(whereClause, eq(moneyTransaction.kind, "expense"));

  const [merchantSpendRows, tagSpendRows, recurringSpendRows] =
    await Promise.all([
      db
        .select({
          merchantId: moneyTransaction.merchantId,
          valueMinor: sql<string>`coalesce(sum(${moneyTransaction.amountMinor}), 0)`,
        })
        .from(moneyTransaction)
        .where(expenseWhere)
        .groupBy(moneyTransaction.merchantId)
        .orderBy(desc(sql`sum(${moneyTransaction.amountMinor})`))
        .limit(15),
      db
        .select({
          tagId: moneyTransactionTag.tagId,
          valueMinor: sql<string>`coalesce(sum(${moneyTransaction.amountMinor}), 0)`,
        })
        .from(moneyTransaction)
        .innerJoin(
          moneyTransactionTag,
          eq(moneyTransactionTag.transactionId, moneyTransaction.id),
        )
        .where(expenseWhere)
        .groupBy(moneyTransactionTag.tagId)
        .orderBy(desc(sql`sum(${moneyTransaction.amountMinor})`))
        .limit(15),
      db
        .select({
          templateId: moneyTransaction.recurrenceSourceId,
          valueMinor: sql<string>`coalesce(sum(${moneyTransaction.amountMinor}), 0)`,
        })
        .from(moneyTransaction)
        .where(
          and(
            expenseWhere,
            sql`${moneyTransaction.recurrenceSourceId} IS NOT NULL`,
          ),
        )
        .groupBy(moneyTransaction.recurrenceSourceId)
        .orderBy(desc(sql`sum(${moneyTransaction.amountMinor})`))
        .limit(15),
    ]);

  const merchantIds = merchantSpendRows
    .map((row) => row.merchantId)
    .filter((id): id is string => id != null);
  const tagIds = tagSpendRows.map((row) => row.tagId);
  const templateIds = recurringSpendRows
    .map((row) => row.templateId)
    .filter((id): id is string => id != null);

  const [merchantRows, tagRows, templateRows] = await Promise.all([
    merchantIds.length > 0
      ? db
          .select({ id: moneyMerchant.id, name: moneyMerchant.name })
          .from(moneyMerchant)
          .where(
            and(
              eq(moneyMerchant.workspaceId, workspaceId),
              inArray(moneyMerchant.id, merchantIds),
            ),
          )
      : Promise.resolve([]),
    tagIds.length > 0
      ? db
          .select({ id: moneyTag.id, name: moneyTag.name })
          .from(moneyTag)
          .where(
            and(
              eq(moneyTag.workspaceId, workspaceId),
              inArray(moneyTag.id, tagIds),
            ),
          )
      : Promise.resolve([]),
    templateIds.length > 0
      ? db
          .select({
            id: moneyRecurrentTemplate.id,
            name: moneyRecurrentTemplate.name,
          })
          .from(moneyRecurrentTemplate)
          .where(
            and(
              eq(moneyRecurrentTemplate.workspaceId, workspaceId),
              inArray(moneyRecurrentTemplate.id, templateIds),
            ),
          )
      : Promise.resolve([]),
  ]);

  const merchantNameById = new Map(merchantRows.map((merchant) => [merchant.id, merchant.name]));
  const tagNameById = new Map(tagRows.map((tag) => [tag.id, tag.name]));
  const templateNameById = new Map(
    templateRows.map((template) => [template.id, template.name]),
  );

  const merchantsSpend: LabelValueRow[] = merchantSpendRows
    .map((row) => {
      const valueMinor = Number(row.valueMinor);
      if (valueMinor <= 0) return null;
      const label =
        row.merchantId == null
          ? "No merchant"
          : (merchantNameById.get(row.merchantId) ?? "Merchant");
      return { label, valueMinor };
    })
    .filter((row): row is LabelValueRow => row != null);

  const tagsSpend: LabelValueRow[] = tagSpendRows
    .map((row) => {
      const valueMinor = Number(row.valueMinor);
      if (valueMinor <= 0) return null;
      return {
        label: tagNameById.get(row.tagId) ?? "Tag",
        valueMinor,
      };
    })
    .filter((row): row is LabelValueRow => row != null);

  const recurringSpend: RecurringSpendRow[] = recurringSpendRows
    .filter((row) => row.templateId != null && Number(row.valueMinor) > 0)
    .map((row) => ({
      label: templateNameById.get(row.templateId!) ?? "Recurring",
      valueMinor: Number(row.valueMinor),
      templateId: row.templateId,
    }));

  return {
    merchantsSpend,
    tagsSpend,
    recurringSpend,
  };
}

