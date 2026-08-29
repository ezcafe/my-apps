import {
  AnalyticsStatsSkeleton,
  MoneyAnalyticsFiltersBarSkeleton,
  MoneyAnalyticsTransactionsTableSkeleton,
  AnalyticsPeriodChipSkeleton,
} from "@/components/money-analytics-skeleton";
import { MoneyListSkeleton } from "@/components/money-feedback";
import { MONEY_DASHBOARD_STACK, MONEY_FULL_SPAN } from "@/lib/money-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

export function InvestmentTableSectionSkeleton({
  titleWidthClass,
}: {
  titleWidthClass: string;
}) {
  return (
    <section className="w-full min-w-0" aria-hidden>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Skeleton
          className={cn("h-6 rounded-[var(--radius-sm)]", titleWidthClass)}
        />
      </div>
      <MoneyListSkeleton variant="tableRows" />
    </section>
  );
}

export function InvestmentPortfolioSnapshotSkeleton() {
  return (
    <section
      aria-label="Portfolio snapshot"
      className="grid gap-3 md:grid-cols-2"
    >
      <InvestmentTableSectionSkeleton titleWidthClass="w-24" />
      <InvestmentTableSectionSkeleton titleWidthClass="w-36" />
    </section>
  );
}

export function MoneyInvestmentsPageSkeleton() {
  return (
    <div
      className={cn(MONEY_FULL_SPAN, MONEY_DASHBOARD_STACK)}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading investments"
    >
      <AnalyticsStatsSkeleton showPeriodLine={false} />
      <InvestmentPortfolioSnapshotSkeleton />
      <AnalyticsPeriodChipSkeleton />
      <MoneyAnalyticsFiltersBarSkeleton />
      <AnalyticsStatsSkeleton showPeriodLine={false} />
      <MoneyAnalyticsTransactionsTableSkeleton selectable />
    </div>
  );
}
