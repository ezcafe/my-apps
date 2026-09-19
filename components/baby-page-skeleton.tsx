import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { BABY_HOME_SMALL_GRID_MIN_H } from "@/lib/baby-home-control-height";
import { SHELL_DASHBOARD_STACK, SHELL_FULL_SPAN } from "@/lib/shell-layout";
import {
  AnalyticsPeriodChipSkeleton,
  MoneyAnalyticsFiltersBarSkeleton,
} from "@/components/money-analytics-skeleton";

/** Matches Baby home: Row1 breast+bottle, Row2 nap+diaper, Row3 pump+amount,
 *  then status, guidelines at page bottom. */
export function BabyHomeSkeleton() {
  return (
    <div
      className={cn(
        SHELL_FULL_SPAN,
        SHELL_DASHBOARD_STACK,
        "fx-fade-in @container",
      )}
      aria-hidden
    >
      <div
        data-skeleton="home-row-breast-bottle"
        className="grid gap-3"
        style={{
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
        }}
      >
        <div
          data-skeleton="section-breast"
          className="flex min-w-0 flex-col space-y-2"
        >
          <Skeleton className="h-4 w-40 rounded-[var(--radius-sm)]" />
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 8rem), 1fr))",
            }}
          >
            <div className="flex min-h-[calc(2*2.75rem+1px)] flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border p-3">
              <Skeleton className="size-6 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-5 w-20 rounded-[var(--radius-sm)]" />
            </div>
            <div className="flex min-h-[calc(2*2.75rem+1px)] flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border p-3">
              <Skeleton className="size-6 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-5 w-20 rounded-[var(--radius-sm)]" />
            </div>
          </div>
        </div>
        <div
          data-skeleton="section-bottle"
          className="flex min-w-0 flex-col space-y-2"
        >
          <Skeleton className="h-4 w-40 rounded-[var(--radius-sm)]" />
          <div
            data-skeleton="bottle-ml-chips"
            className="grid min-h-[calc(2*2.75rem+1px)] grid-cols-2 grid-rows-2 gap-0 overflow-hidden rounded-[var(--radius-md)] border border-border"
          >
            <Skeleton className="min-h-11 w-full rounded-none" />
            <Skeleton className="min-h-11 w-full rounded-none" />
            <Skeleton className="min-h-11 w-full rounded-none" />
            <Skeleton
              data-skeleton="custom-ml"
              className="min-h-11 w-full rounded-none"
            />
          </div>
        </div>
      </div>

      <div
        data-skeleton="home-row-nap-diaper"
        className="grid gap-3"
        style={{
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
        }}
      >
        <div
          data-skeleton="section-nap"
          className="flex min-w-0 flex-col space-y-2"
        >
          <Skeleton className="h-4 w-40 rounded-[var(--radius-sm)]" />
          <div className="flex min-h-[calc(2*2.75rem+1px)] flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border p-3">
            <Skeleton className="size-6 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-4 w-20 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-5 w-16 rounded-[var(--radius-sm)]" />
          </div>
        </div>
        <div
          data-skeleton="section-diaper"
          className="flex min-w-0 flex-col space-y-2"
        >
          <Skeleton className="h-4 w-40 rounded-[var(--radius-sm)]" />
          <div
            data-skeleton="diaper-kind-2x2"
            className="grid min-h-[calc(2*2.75rem+1px)] grid-cols-2 grid-rows-2 gap-0 overflow-hidden rounded-[var(--radius-md)] border border-border"
          >
            <Skeleton className="min-h-11 w-full rounded-none" />
            <Skeleton className="min-h-11 w-full rounded-none" />
            <Skeleton className="min-h-11 w-full rounded-none" />
            <Skeleton className="min-h-11 w-full rounded-none" />
          </div>
        </div>
      </div>

      <div
        data-skeleton="home-row-pump"
        className="flex min-w-0 flex-col space-y-2"
      >
        <Skeleton
          data-skeleton="section-pump-header"
          className="h-4 w-40 rounded-[var(--radius-sm)]"
        />
        <div
          className="grid items-stretch gap-3"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 8rem), 1fr))",
          }}
        >
          <div
            data-skeleton="section-pump"
            className="flex min-h-[calc(2*2.75rem+1px)] flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border p-3"
          >
            <Skeleton className="size-6 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-5 w-20 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-3 w-16 rounded-[var(--radius-sm)]" />
          </div>
          <div className="flex min-h-[calc(2*2.75rem+1px)] flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border p-3">
            <Skeleton className="size-6 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-5 w-20 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-3 w-16 rounded-[var(--radius-sm)]" />
          </div>
          <div
            data-skeleton="section-pump-amount"
            className="flex h-full min-w-0 flex-col gap-1"
          >
            <div
              data-skeleton="pump-amount-ml-chips"
              className="grid h-full min-h-[calc(2*2.75rem+1px)] grid-cols-2 grid-rows-2 gap-0 overflow-hidden rounded-[var(--radius-md)] border border-border"
            >
              <Skeleton className="min-h-11 w-full rounded-none" />
              <Skeleton className="min-h-11 w-full rounded-none" />
              <Skeleton className="min-h-11 w-full rounded-none" />
              <Skeleton className="min-h-11 w-full rounded-none" />
            </div>
            <Skeleton className="h-3 w-28 rounded-[var(--radius-sm)]" />
          </div>
        </div>
      </div>

      <div className="space-y-3" data-skeleton="home-status">
        <div className="space-y-1 border-b border-border/70 pb-3">
          <Skeleton className="h-5 w-full max-w-sm rounded-[var(--radius-sm)]" />
        </div>
        <div className="space-y-1 border-b border-border/70 pb-3">
          <Skeleton className="h-5 w-full max-w-xs rounded-[var(--radius-sm)]" />
        </div>
        <div className="space-y-1 border-b border-border/70 pb-3">
          <Skeleton className="h-5 w-full max-w-sm rounded-[var(--radius-sm)]" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-5 w-full max-w-sm rounded-[var(--radius-sm)]" />
        </div>
      </div>

      <div
        data-skeleton="home-row-guidelines"
        className="space-y-2 rounded-[var(--radius-md)] border border-border p-2"
      >
        <Skeleton
          data-skeleton="guideline-header"
          className="h-11 w-full rounded-[var(--radius-sm)]"
        />
        <Skeleton
          data-skeleton="guideline-header"
          className="h-11 w-full rounded-[var(--radius-sm)]"
        />
        <Skeleton
          data-skeleton="guideline-header"
          className="h-11 w-full rounded-[var(--radius-sm)]"
        />
        <Skeleton
          data-skeleton="guideline-header"
          className="h-11 w-full rounded-[var(--radius-sm)]"
        />
      </div>
    </div>
  );
}

/** Breast L/R timed chips + formula ml 2×2 (Pump page grid parity). */
export function BabyFeedSkeleton() {
  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
      aria-hidden
      data-testid="baby-feed-page-skeleton"
    >
      <div
        className="grid items-stretch gap-3"
        style={{
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 8rem), 1fr))",
        }}
        data-skeleton="feed-timer-chips"
      >
        <Skeleton className="min-h-14 rounded-[var(--radius-md)]" />
        <Skeleton className="min-h-14 rounded-[var(--radius-md)]" />
        <div
          className={cn(
            "grid h-full grid-cols-2 grid-rows-2 gap-0 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface",
            BABY_HOME_SMALL_GRID_MIN_H,
          )}
          data-skeleton="feed-formula-ml-chips"
        >
          <Skeleton className="min-h-11 w-full rounded-none" />
          <Skeleton className="min-h-11 w-full rounded-none" />
          <Skeleton className="min-h-11 w-full rounded-none" />
          <Skeleton className="min-h-11 w-full rounded-none" />
        </div>
      </div>
    </div>
  );
}

/** Pump L/R + pump amount ml chips. */
export function BabyPumpSkeleton() {
  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
      aria-hidden
      data-testid="baby-pump-page-skeleton"
    >
      <div
        className="grid items-stretch gap-3"
        style={{
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 8rem), 1fr))",
        }}
        data-skeleton="pump-timer-chips"
      >
        <Skeleton className="min-h-14 rounded-[var(--radius-md)]" />
        <Skeleton className="min-h-14 rounded-[var(--radius-md)]" />
        <div
          className={cn(
            "grid h-full grid-cols-2 grid-rows-2 gap-0 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface",
            BABY_HOME_SMALL_GRID_MIN_H,
          )}
          data-skeleton="pump-amount-ml-chips"
        >
          <Skeleton className="min-h-11 w-full rounded-none" />
          <Skeleton className="min-h-11 w-full rounded-none" />
          <Skeleton className="min-h-11 w-full rounded-none" />
          <Skeleton className="min-h-11 w-full rounded-none" />
        </div>
      </div>
    </div>
  );
}

/** Diaper 2×2 kind control (heading in layout). */
export function BabyDiaperSkeleton() {
  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
      aria-hidden
      data-testid="baby-diaper-page-skeleton"
    >
      <div
        className={cn(
          "grid h-full grid-cols-2 grid-rows-2 gap-0 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface",
          BABY_HOME_SMALL_GRID_MIN_H,
        )}
        data-skeleton="diaper-kind-2x2"
      >
        <Skeleton className="min-h-11 w-full rounded-none" />
        <Skeleton className="min-h-11 w-full rounded-none" />
        <Skeleton className="min-h-11 w-full rounded-none" />
        <Skeleton className="min-h-11 w-full rounded-none" />
      </div>
    </div>
  );
}

/** Open-session hint + one TimedCareChip (Nap clone). */
export function BabySleepSkeleton() {
  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
      aria-hidden
      data-testid="baby-sleep-page-skeleton"
    >
      <Skeleton className="h-5 w-40 rounded-[var(--radius-sm)]" />
      <div data-skeleton="sleep-action-chips">
        <Skeleton className="min-h-14 w-full max-w-xs rounded-[var(--radius-md)]" />
      </div>
    </div>
  );
}

/** Flat recent list with Edit/Delete action slots (no charts). */
export function BabyGrowthListSkeleton() {
  return (
    <div className="divide-y divide-border/80 border-y border-border/80" aria-hidden>
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={`growth-row-${index}`}
          className="flex flex-wrap items-center justify-between gap-3 py-3"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-40 max-w-full rounded-[var(--radius-sm)]" />
            <Skeleton className="h-4 w-28 rounded-[var(--radius-sm)]" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-14 rounded-[var(--radius-md)]" />
            <Skeleton className="h-9 w-16 rounded-[var(--radius-md)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** @deprecated Prefer BabyGrowthListSkeleton */
export const BabyMeasureListSkeleton = BabyGrowthListSkeleton;

export function BabyGrowthPageSkeleton() {
  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
      aria-hidden
      data-testid="baby-growth-page-skeleton"
    >
      <div
        className="flex flex-wrap gap-1 rounded-[var(--radius-md)] border border-border bg-background p-1"
        data-skeleton="growth-kind-chips"
      >
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton
            key={`growth-chip-${index}`}
            className="h-[calc(1.5rem+1.5em+2px)] w-20 rounded-[var(--radius-sm)]"
          />
        ))}
      </div>
      <div
        className="flex flex-col gap-3"
        data-skeleton="growth-form"
      >
        <Skeleton className="h-16 w-full rounded-[var(--radius-md)]" />
        <Skeleton className="h-14 w-full rounded-[var(--radius-md)]" />
        <Skeleton className="h-20 w-full rounded-[var(--radius-md)]" />
        <Skeleton className="h-12 w-28 rounded-[var(--radius-md)]" />
      </div>
    </div>
  );
}

/** @deprecated Prefer BabyGrowthPageSkeleton */
export const BabyMeasurePageSkeleton = BabyGrowthPageSkeleton;

/** Flat language + optional telegram SettingsSection chrome. */
export function BabySettingsSkeleton({
  telegramEnabled = false,
}: {
  telegramEnabled?: boolean;
}) {
  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
      aria-hidden
    >
      <section className="space-y-4">
        <div className="border-b border-border/70 pb-3">
          <Skeleton className="h-7 w-28 rounded-[var(--radius-sm)]" />
        </div>
        <div className="pt-1">
          <div className="flex gap-2">
            <Skeleton className="h-11 w-28 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-11 w-28 rounded-[var(--radius-sm)]" />
          </div>
        </div>
      </section>
      {telegramEnabled ? (
        <section className="space-y-4">
          <div className="border-b border-border/70 pb-3">
            <Skeleton className="h-7 w-40 rounded-[var(--radius-sm)]" />
            <Skeleton className="mt-1 h-4 w-3/4 rounded-[var(--radius-sm)]" />
          </div>
          <div className="space-y-3 pt-1">
            <Skeleton className="h-5 w-48 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-4 w-64 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-14 w-40 rounded-[var(--radius-md)]" />
          </div>
        </section>
      ) : (
        <Skeleton className="h-5 w-36 rounded-[var(--radius-sm)]" />
      )}
    </div>
  );
}

export function BabyGrowthChartSkeleton() {
  return (
    <Card className="flex h-[280px] min-h-[280px] max-h-[280px] flex-col p-4" aria-hidden>
      <Skeleton className="mb-3 h-5 w-28 rounded-[var(--radius-sm)]" />
      <Skeleton className="min-h-0 flex-1 w-full rounded-[var(--radius-sm)]" />
    </Card>
  );
}

/** Selectable list chrome: checkbox → event → recorded → actions (+ mobile). */
export function BabyInsightsListSkeleton({
  columns = 4,
  rows = 2,
  selectable = true,
}: {
  columns?: number;
  rows?: number;
  selectable?: boolean;
}) {
  const colCount = selectable ? Math.max(columns, 4) : columns;
  return (
    <div className="@container w-full min-w-0" aria-hidden>
      <div className="hidden min-w-0 @md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: colCount }, (_, index) => (
                <TableHead
                  key={`insights-list-head-${index}`}
                  className={index === 0 && selectable ? "w-10" : undefined}
                  freeze={
                    selectable
                      ? index === 0
                        ? "leading"
                        : index === 1
                          ? "afterCheckbox"
                          : undefined
                      : undefined
                  }
                >
                  {selectable && index === 0 ? (
                    <Skeleton className="size-4 rounded-[var(--radius-sm)]" />
                  ) : (
                    <Skeleton className="h-4 w-full rounded-[var(--radius-sm)]" />
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }, (_, rowIndex) => (
              <TableRow key={`insights-list-row-${rowIndex}`}>
                {Array.from({ length: colCount }, (_, colIndex) => (
                  <TableCell
                    key={`insights-list-cell-${rowIndex}-${colIndex}`}
                    className={
                      colIndex === 0 && selectable ? "w-10" : undefined
                    }
                    freeze={
                      selectable
                        ? colIndex === 0
                          ? "leading"
                          : colIndex === 1
                            ? "afterCheckbox"
                            : undefined
                        : undefined
                    }
                  >
                    {selectable && colIndex === 0 ? (
                      <Skeleton className="size-4 rounded-[var(--radius-sm)]" />
                    ) : selectable && colIndex === colCount - 1 ? (
                      <Skeleton className="ml-auto h-8 w-12 rounded-[var(--radius-sm)]" />
                    ) : (
                      <Skeleton className="h-4 w-full rounded-[var(--radius-sm)]" />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-2 @md:hidden">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={`insights-list-card-${index}`}
            className="flex min-h-12 items-start gap-3 rounded-[var(--radius-sm)] border border-border bg-surface px-4 py-3"
          >
            {selectable ? (
              <Skeleton className="mt-0.5 size-4 shrink-0 rounded-[var(--radius-sm)]" />
            ) : null}
            <div className="min-w-0 flex-1">
              <Skeleton className="h-5 w-40 max-w-full rounded-[var(--radius-sm)]" />
              <Skeleton className="mt-2 h-4 w-28 rounded-[var(--radius-sm)]" />
            </div>
            {selectable ? (
              <Skeleton className="h-8 w-12 shrink-0 rounded-[var(--radius-sm)]" />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Insights stack (CLS): cue → filters → period →
 * Hydration + Night Rest charts → collapsed More insights (no Activity log).
 */
export function BabyInsightsPageSkeleton() {
  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading insights"
    >
      <Skeleton
        data-skeleton="insights-activities-cue"
        className="h-4 w-64 max-w-full rounded-[var(--radius-sm)]"
      />
      <MoneyAnalyticsFiltersBarSkeleton triggerCount={1} />
      <AnalyticsPeriodChipSkeleton />
      <section
        className="grid gap-4"
        style={{
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))",
        }}
        aria-hidden
      >
        <BabyGrowthChartSkeleton />
        <BabyGrowthChartSkeleton />
      </section>
      <Skeleton className="h-12 w-40 rounded-[var(--radius-md)]" />
    </div>
  );
}

/**
 * Activities stack (CLS): filters → period chip → selectable ledger rows.
 * No summary strip / care-type pill row.
 */
export function BabyActivitiesPageSkeleton() {
  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading activities"
      data-testid="baby-activities-skeleton"
    >
      <div data-skeleton="activities-filters">
        <MoneyAnalyticsFiltersBarSkeleton triggerCount={2} />
      </div>
      <div data-skeleton="activities-period">
        <AnalyticsPeriodChipSkeleton />
      </div>
      <div data-skeleton="activities-ledger">
        <BabyInsightsListSkeleton selectable rows={4} />
      </div>
    </div>
  );
}
