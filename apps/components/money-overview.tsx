"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { defaultAnalyticsFilters } from "@/components/analytics-filters";
import {
  chartExpenseColor,
  chartIncomeColor,
} from "@/components/charts/chart-income-expense-colors";
import { useTheme } from "@/components/theme-provider";
import { useWorkspaceCurrency } from "@/components/money-workspace-provider";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { buttonClassName } from "@/components/ui/button";
import { MONEY_FULL_SPAN } from "@/lib/money-layout";
import { MoneyOverviewSkeleton } from "@/components/money-overview-skeleton";
import { buildQuery } from "@/lib/analytics-build-query";
import { cn } from "@/lib/cn";
import { useFormatDate } from "@/lib/format-date";
import { formatMinor } from "@/lib/format-money";
import { moneyCategoryLabel, type MoneyCategoryRow } from "@/lib/money-category-ui";
import {
  moneyAnalyticsDistributionQueryOptions,
  moneyAnalyticsSummaryQueryOptions,
  moneyBootstrapQueryOptions,
  moneyTransactionsQueryOptions,
  type MoneyTransactionListRow,
} from "@/lib/money-query-options";
import { colorByIndex } from "@/components/charts/chart-colors";

const RECENT_PAGE_SIZE = 8;
const TOP_CATEGORY_COUNT = 5;

function useDefaultMonthFilterQuery() {
  return useMemo(() => buildQuery(defaultAnalyticsFilters()), []);
}

function OverviewKpis({
  expenseMinor,
  incomeMinor,
  netMinor,
  currency,
  periodLabel,
  animationKey,
}: {
  expenseMinor: number;
  incomeMinor: number;
  netMinor: number;
  currency: string;
  periodLabel: string;
  animationKey: string;
}) {
  const { resolved, style } = useTheme();
  const incomeColor = chartIncomeColor(resolved, style);
  const expenseColor = chartExpenseColor(resolved, style);
  const netColor = netMinor >= 0 ? incomeColor : expenseColor;

  return (
    <section aria-label="This month" className="fx-fade-in space-y-2">
      <p className="text-xs text-muted">
        {periodLabel ? <>Totals for {periodLabel}</> : <>Totals for this month</>}
      </p>
      <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-x-6 gap-y-3 border-b border-border pb-4">
        <div>
          <p className="text-sm font-medium text-muted">Spent</p>
          <p className="mt-1 font-display text-2xl font-semibold tracking-tight tabular-nums">
            <AnimatedNumber
              value={expenseMinor}
              format={(n) => formatMinor(Math.round(n), currency)}
              style={{ color: expenseColor }}
              animationKey={animationKey}
            />
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted">Income</p>
          <p className="mt-1 font-display text-2xl font-semibold tracking-tight tabular-nums">
            <AnimatedNumber
              value={incomeMinor}
              format={(n) => formatMinor(Math.round(n), currency)}
              style={{ color: incomeColor }}
              animationKey={animationKey}
            />
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted">Net</p>
          <p className="mt-1 font-display text-2xl font-semibold tracking-tight tabular-nums">
            <AnimatedNumber
              value={netMinor}
              format={(n) => formatMinor(Math.round(n), currency)}
              style={{ color: netColor }}
              animationKey={animationKey}
            />
          </p>
        </div>
      </div>
    </section>
  );
}

function TopCategories({
  rows,
  currency,
}: {
  rows: { label: string; valueMinor: number; color: string }[];
  currency: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted">No spending categories in this range yet.</p>
    );
  }
  const max = Math.max(...rows.map((r) => r.valueMinor), 1);
  return (
    <ul className="space-y-2.5" aria-label="Top spending categories">
      {rows.map((row) => (
        <li key={row.label} className="min-w-0">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-foreground">
              {row.label}
            </span>
            <span className="shrink-0 tabular-nums text-muted">
              {formatMinor(row.valueMinor, currency)}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-[var(--radius-sm)] bg-muted-surface">
            <div
              className="h-full rounded-[var(--radius-sm)] transition-[width] duration-300"
              style={{
                width: `${Math.round((row.valueMinor / max) * 100)}%`,
                backgroundColor: row.color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function RecentTransactions({
  rows,
  accountById,
  categoryById,
  currency,
}: {
  rows: MoneyTransactionListRow[];
  accountById: Map<string, { name: string }>;
  categoryById: Map<string, MoneyCategoryRow>;
  currency: string;
}) {
  const { formatDate } = useFormatDate();
  const { resolved, style } = useTheme();
  const incomeColor = chartIncomeColor(resolved, style);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted">No transactions this month yet.</p>
    );
  }

  return (
    <ul className="divide-y divide-border" aria-label="Recent transactions">
      {rows.map((tx) => {
        const cat = tx.categoryId ? categoryById.get(tx.categoryId) : null;
        const label =
          tx.kind === "transfer"
            ? "Transfer"
            : cat
              ? moneyCategoryLabel(cat, categoryById)
              : (accountById.get(tx.accountId)?.name ?? "Transaction");
        const signed =
          tx.kind === "income"
            ? tx.amountMinor
            : tx.kind === "expense"
              ? -tx.amountMinor
              : tx.amountMinor;
        const accountName = accountById.get(tx.accountId)?.name;
        return (
          <li
            key={tx.id}
            className="flex min-w-0 items-baseline justify-between gap-3 py-2.5 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted">
                {formatDate(tx.occurredAt, { omitYear: true })}
                {accountName ? ` · ${accountName}` : null}
              </p>
            </div>
            <span
              className="shrink-0 tabular-nums font-medium"
              style={
                tx.kind === "income" ? { color: incomeColor } : undefined
              }
            >
              {tx.kind === "income" ? "+" : tx.kind === "expense" ? "−" : ""}
              {formatMinor(Math.abs(signed), currency)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function MoneyOverview() {
  const { workspaceId, defaultCurrency, workspaceReady } = useWorkspaceCurrency();
  const filterQuery = useDefaultMonthFilterQuery();
  const { formatPeriod } = useFormatDate();
  const { resolved, style } = useTheme();

  const bootstrapQuery = useQuery({
    ...moneyBootstrapQueryOptions(),
    enabled: workspaceReady,
  });

  const summaryQuery = useQuery({
    ...moneyAnalyticsSummaryQueryOptions(workspaceId ?? "", filterQuery),
    enabled: workspaceReady && Boolean(workspaceId),
  });

  const distributionQuery = useQuery({
    ...moneyAnalyticsDistributionQueryOptions(workspaceId ?? "", filterQuery),
    enabled: workspaceReady && Boolean(workspaceId),
  });

  const recentQuery = useQuery({
    ...moneyTransactionsQueryOptions(
      workspaceId ?? "",
      filterQuery,
      1,
      RECENT_PAGE_SIZE,
      "occurredAt",
      "desc",
    ),
    enabled: workspaceReady && Boolean(workspaceId),
  });

  const loading =
    !workspaceReady ||
    summaryQuery.isLoading ||
    distributionQuery.isLoading ||
    recentQuery.isLoading ||
    bootstrapQuery.isLoading;

  const summary = summaryQuery.data?.moneyAnalyticsSummary;
  const distribution = distributionQuery.data?.moneyAnalyticsDistribution;
  const currency = defaultCurrency || "USD";

  const accountById = useMemo(() => {
    const map = new Map<string, { name: string }>();
    for (const a of bootstrapQuery.data?.accounts ?? []) {
      map.set(a.id, { name: a.name });
    }
    return map;
  }, [bootstrapQuery.data?.accounts]);

  const categoryById = useMemo(() => {
    const map = new Map<string, MoneyCategoryRow>();
    for (const c of bootstrapQuery.data?.categories ?? []) {
      map.set(c.id, c);
    }
    return map;
  }, [bootstrapQuery.data?.categories]);

  const topCategories = useMemo(() => {
    const pie = distribution?.pieSpend ?? [];
    return pie
      .filter((p) => p.valueMinor > 0)
      .slice(0, TOP_CATEGORY_COUNT)
      .map((p, i) => ({
        label: p.label,
        valueMinor: p.valueMinor,
        color: colorByIndex(resolved, i, style),
      }));
  }, [distribution?.pieSpend, resolved, style]);

  if (loading && !summary) {
    return <MoneyOverviewSkeleton />;
  }

  const periodLabel = summary
    ? formatPeriod(summary.range.from, summary.range.to)
    : "";
  const animationKey = summary
    ? `${summary.range.from}-${summary.range.to}`
    : "idle";

  return (
    <div className={`${MONEY_FULL_SPAN} space-y-8`}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Home
          </h1>
          <p className="mt-1 text-sm text-muted">
            How you are doing this month, at a glance.
          </p>
        </div>
        <Link
          href="/money/new"
          className={cn(buttonClassName({ variant: "primary", size: "md" }))}
        >
          Add transaction
        </Link>
      </header>

      {summary ? (
        <OverviewKpis
          expenseMinor={summary.stats.expenseMinor}
          incomeMinor={summary.stats.incomeMinor}
          netMinor={summary.stats.netMinor}
          currency={currency}
          periodLabel={periodLabel}
          animationKey={animationKey}
        />
      ) : null}

      <section className="space-y-3 fx-fade-in">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-medium">Top categories</h2>
          <Link
            href="/money/analytics"
            className="text-sm font-medium text-accent transition-colors duration-200 hover:opacity-90"
          >
            View insights
          </Link>
        </header>
        <TopCategories rows={topCategories} currency={currency} />
      </section>

      <section className="space-y-3 fx-fade-in">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-medium">Recent</h2>
          <Link
            href="/money/spending"
            className="text-sm font-medium text-accent transition-colors duration-200 hover:opacity-90"
          >
            View all
          </Link>
        </header>
        <RecentTransactions
          rows={recentQuery.data?.data ?? []}
          accountById={accountById}
          categoryById={categoryById}
          currency={currency}
        />
      </section>
    </div>
  );
}
