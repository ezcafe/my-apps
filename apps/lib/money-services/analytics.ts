import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  moneyAccount,
  moneyCategory,
  moneyMerchant,
  moneyRecurrentTemplate,
  moneyTag,
  moneyTransaction,
  moneyTransactionTag,
} from "@/db/schema/money";
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

async function loadWorkspaceAccounts(
  workspaceId: string,
  loaders?: MoneyServiceLoaders,
) {
  if (loaders) {
    return getOrCreate(loaders, `accounts:${workspaceId}`, () =>
      db
        .select({ id: moneyAccount.id, name: moneyAccount.name })
        .from(moneyAccount)
        .where(eq(moneyAccount.workspaceId, workspaceId)),
    );
  }
  return db
    .select({ id: moneyAccount.id, name: moneyAccount.name })
    .from(moneyAccount)
    .where(eq(moneyAccount.workspaceId, workspaceId));
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
    /** Graph ids: `a:` account, `c:` category, `b:` budget (when budgets apply). */
    nodes: { id: string; name: string }[];
    links: { source: string; target: string; value: number }[];
  };
};

export type MoneyAnalyticsLeadersPayload = {
  merchantsSpend: LabelValueRow[];
  tagsSpend: LabelValueRow[];
  recurringSpend: RecurringSpendRow[];
};

type SankeyLink = { source: string; target: string; value: number };

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
      fetchCumulativeLine(whereClause),
      fetchCumulativeLine(and(...prevConditions)),
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

  const raw = await fetchCumulativeLine(whereClause);
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

  const conditions = moneyTransactionConditionsForAnalytics(
    workspaceId,
    filters,
  );
  const whereClause = and(...conditions);

  const monthExpr = sql`to_char((${moneyTransaction.occurredAt} at time zone 'utc'), 'YYYY-MM')`;
  const [columnRows, lineResult] = await Promise.all([
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
    buildNetLineSeries(workspaceId, filters, from, to),
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
  const conditions = moneyTransactionConditionsForAnalytics(
    workspaceId,
    filters,
  );
  const whereClause = and(...conditions);
  const monthExpr = sql`to_char((${moneyTransaction.occurredAt} at time zone 'utc'), 'YYYY-MM')`;

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
        .groupBy(monthExpr, moneyTransaction.categoryId)
        .orderBy(monthExpr),
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
  const { fromISO: from, toISO: to } = resolveAnalyticsDateBounds(filters);
  const conditions = moneyTransactionConditionsForAnalytics(
    workspaceId,
    filters,
  );
  const whereClause = and(...conditions);
  const sankeySql = sql`
      SELECT
        ${moneyTransaction.kind} as kind,
        ${moneyTransaction.accountId} as account_id,
        ${moneyTransaction.categoryId} as category_id,
        coalesce(${moneyAccount.name}, 'Account') as account_name,
        coalesce(${moneyCategory.name}, 'Uncategorized') as category_name,
        coalesce(sum(${moneyTransaction.amountMinor}), 0) as value_minor
      FROM ${moneyTransaction}
      INNER JOIN ${moneyAccount} ON ${moneyTransaction.accountId} = ${moneyAccount.id}
      LEFT JOIN ${moneyCategory} ON ${moneyTransaction.categoryId} = ${moneyCategory.id}
      WHERE ${whereClause}
        AND ${moneyTransaction.kind} IN ('expense', 'income')
      GROUP BY
        ${moneyTransaction.kind},
        ${moneyTransaction.accountId},
        ${moneyAccount.name},
        ${moneyTransaction.categoryId},
        ${moneyCategory.name}
    `;

  const [categories, accountRows, budgetRowsResolved, sankeyExec] =
    await Promise.all([
      loadWorkspaceCategories(workspaceId, loaders),
      loadWorkspaceAccounts(workspaceId, loaders),
      loadWorkspaceBudgets(workspaceId, from, to, loaders),
      db.execute(sankeySql),
    ]);

  const budgetRows = budgetRowsResolved as BudgetListRowEnriched[];
  const accountNameById = new Map(accountRows.map((account) => [account.id, account.name]));
  const categoryRowsForSankey: CategoryRow[] = categories.map((category) => ({
    id: category.id,
    parentId: category.parentId ?? null,
    name: category.name,
  }));
  const categoryLabels = buildCategoryLabelMap(categoryRowsForSankey);

  const sankeyRowsRaw = sankeyExec as unknown as Iterable<{
    kind: string;
    account_id: string;
    category_id: string | null;
    account_name: string;
    category_name: string;
    value_minor: string | number | bigint | null;
  }>;
  const labelById = new Map<string, string>();
  const expenseLinks: SankeyLink[] = [];
  const incomeLinks: SankeyLink[] = [];

  for (const row of sankeyRowsRaw) {
    const accountKey = `a:${String(row.account_id)}`;
    const categoryKey = `c:${row.category_id ?? "uncategorized"}`;
    const value = Number(row.value_minor ?? 0);
    if (value <= 0) continue;

    const accountLabel = String(row.account_name);
    const categoryLabel = String(row.category_name);
    labelById.set(accountKey, accountLabel);
    labelById.set(
      categoryKey,
      sankeyNodeLabel(categoryKey, categoryLabel, categoryLabels),
    );

    if (row.kind === "expense") {
      expenseLinks.push({
        source: accountKey,
        target: categoryKey,
        value,
      });
    } else if (row.kind === "income") {
      incomeLinks.push({
        source: categoryKey,
        target: accountKey,
        value,
      });
    }
  }

  const augmented = augmentExpenseSankeyWithBudgets(
    expenseLinks,
    budgetRows,
    categoryRowsForSankey,
    accountNameById,
    categoryLabels,
  );
  for (const [id, name] of augmented.labelById) {
    labelById.set(id, name);
  }

  const allSankeyLinks: SankeyLink[] = [...augmented.links, ...incomeLinks];
  const nodeIds = new Set<string>();
  for (const link of allSankeyLinks) {
    nodeIds.add(link.source);
    nodeIds.add(link.target);
  }

  return {
    sankey: {
      nodes: [...nodeIds].map((id) => ({ id, name: labelById.get(id) ?? id })),
      links: allSankeyLinks,
    },
  };
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

