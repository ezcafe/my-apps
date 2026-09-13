import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { SHELL_DASHBOARD_STACK, SHELL_FULL_SPAN } from "@/lib/shell-layout";
import {
  AnalyticsPeriodChipSkeleton,
  MoneyAnalyticsFiltersBarSkeleton,
} from "@/components/money-analytics-skeleton";

/** Matches Baby home: breast row, then bottle | nap | diaper (auto-fit row),
 *  then guide caveat + status. Pending bar and birth-date prompt are below —
 *  skeleton draws nothing for them so they never shift the rows. */
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
      {/* Breast section */}
      <div data-skeleton="section-breast" className="space-y-2">
        <Skeleton className="h-4 w-48 max-w-full rounded-[var(--radius-sm)]" />
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 8rem), 1fr))",
          }}
        >
          <div className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border p-3">
            <Skeleton className="size-6 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-5 w-20 rounded-[var(--radius-sm)]" />
          </div>
          <div className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border p-3">
            <Skeleton className="size-6 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-5 w-20 rounded-[var(--radius-sm)]" />
          </div>
        </div>
      </div>

      {/* Wide: Bottle | Nap | Diaper one row */}
      <div
        data-skeleton="home-row-bottle-nap-diaper"
        className="grid gap-3"
        style={{
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
        }}
      >
        <div
          data-skeleton="section-bottle"
          className="flex min-w-0 flex-col space-y-2"
        >
          <Skeleton className="h-4 w-40 rounded-[var(--radius-sm)]" />
          <div
            data-skeleton="bottle-ml-chips"
            className="grid min-h-20 grid-cols-2 grid-rows-2 gap-0 overflow-hidden rounded-[var(--radius-md)] border border-border"
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

        <div
          data-skeleton="section-nap"
          className="flex min-w-0 flex-col space-y-2"
        >
          <Skeleton className="h-4 w-full max-w-md rounded-[var(--radius-sm)]" />
          <div className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border p-3">
            <Skeleton className="size-6 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-4 w-20 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-5 w-16 rounded-[var(--radius-sm)]" />
          </div>
        </div>

        <div
          data-skeleton="section-diaper"
          className="flex min-w-0 flex-col space-y-2"
        >
          <Skeleton className="h-4 w-48 max-w-full rounded-[var(--radius-sm)]" />
          <div
            data-skeleton="diaper-kind-2x2"
            className="grid min-h-20 grid-cols-2 grid-rows-2 gap-0 overflow-hidden rounded-[var(--radius-md)] border border-border"
          >
            <Skeleton className="min-h-11 w-full rounded-none" />
            <Skeleton className="min-h-11 w-full rounded-none" />
            <Skeleton className="min-h-11 w-full rounded-none" />
            <Skeleton className="min-h-11 w-full rounded-none" />
          </div>
        </div>
      </div>

      {/* Guide caveat — live UI shows when birthDate set; reserve slot for CLS */}
      <Skeleton
        data-skeleton="guide-caveat"
        className="h-3 w-full max-w-md rounded-[var(--radius-sm)]"
      />
      {/* Status lines — one sentence each (no separate title row) */}
      <div className="space-y-3" data-skeleton="home-status">
        <div className="space-y-1 border-b border-border/70 pb-3">
          <Skeleton className="h-5 w-full max-w-sm rounded-[var(--radius-sm)]" />
        </div>
        <div className="space-y-1 border-b border-border/70 pb-3">
          <Skeleton className="h-5 w-full max-w-xs rounded-[var(--radius-sm)]" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-5 w-full max-w-sm rounded-[var(--radius-sm)]" />
        </div>
      </div>
    </div>
  );
}

/** Start/End timer first, then method grid, then optional amount/duration. */
export function BabyFeedSkeleton() {
  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
      aria-hidden
    >
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 10rem), 1fr))",
        }}
      >
        <Skeleton className="h-14 rounded-[var(--radius-md)]" />
        <Skeleton className="h-14 rounded-[var(--radius-md)]" />
      </div>
      <Skeleton className="h-7 w-28 rounded-[var(--radius-sm)]" />
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 10rem), 1fr))",
        }}
      >
        <Skeleton className="h-14 rounded-[var(--radius-md)]" />
        <Skeleton className="h-14 rounded-[var(--radius-md)]" />
        <Skeleton className="h-14 rounded-[var(--radius-md)]" />
        <Skeleton className="h-14 rounded-[var(--radius-md)]" />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Skeleton className="h-16 w-full max-w-xs rounded-[var(--radius-md)]" />
        <Skeleton className="h-16 w-full max-w-xs rounded-[var(--radius-md)]" />
      </div>
    </div>
  );
}

/** Three diaper kind CTAs (heading in layout). */
export function BabyDiaperSkeleton() {
  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
      aria-hidden
    >
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 10rem), 1fr))",
        }}
      >
        <Skeleton className="h-14 rounded-[var(--radius-md)]" />
        <Skeleton className="h-14 rounded-[var(--radius-md)]" />
        <Skeleton className="h-14 rounded-[var(--radius-md)]" />
      </div>
    </div>
  );
}

/** Open-session hint + Start/end CTAs (heading in layout). */
export function BabySleepSkeleton() {
  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
      aria-hidden
    >
      <Skeleton className="h-5 w-40 rounded-[var(--radius-sm)]" />
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
        }}
      >
        <Skeleton className="h-14 rounded-[var(--radius-md)]" />
        <Skeleton className="h-14 rounded-[var(--radius-md)]" />
      </div>
    </div>
  );
}

/** Flat add form + recent list with Edit/Delete action slots (no charts). */
export function BabyMeasureListSkeleton() {
  return (
    <div className="divide-y divide-border/80 border-y border-border/80" aria-hidden>
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={`measure-row-${index}`}
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

export function BabyMeasurePageSkeleton() {
  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
      aria-hidden
    >
      <div className="flex flex-wrap gap-1 rounded-[var(--radius-md)] border border-border bg-background p-1">
        <Skeleton className="h-[calc(1.5rem+1.5em+2px)] w-20 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-[calc(1.5rem+1.5em+2px)] w-20 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-[calc(1.5rem+1.5em+2px)] w-20 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-[calc(1.5rem+1.5em+2px)] w-24 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-[calc(1.5rem+1.5em+2px)] w-24 rounded-[var(--radius-sm)]" />
      </div>
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 10rem), 1fr))",
        }}
      >
        <Skeleton className="h-16 rounded-[var(--radius-md)]" />
        <Skeleton className="h-16 rounded-[var(--radius-md)]" />
        <Skeleton className="h-14 w-28 rounded-[var(--radius-md)]" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-40 rounded-[var(--radius-sm)]" />
        <BabyMeasureListSkeleton />
      </div>
    </div>
  );
}

/** Name + dose chips + save, then list. */
export function BabyVaccinesPageSkeleton() {
  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
      aria-hidden
    >
      <div className="space-y-3">
        <Skeleton className="h-16 w-full max-w-md rounded-[var(--radius-md)]" />
        <div className="flex flex-wrap gap-1 rounded-[var(--radius-md)] border border-border bg-background p-1">
          <Skeleton className="h-[calc(1.5rem+1.5em+2px)] w-20 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-[calc(1.5rem+1.5em+2px)] w-24 rounded-[var(--radius-sm)]" />
        </div>
        <Skeleton className="h-14 w-28 rounded-[var(--radius-md)]" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-32 rounded-[var(--radius-sm)]" />
        <div className="divide-y divide-border/80 border-y border-border/80">
          <Skeleton className="my-3 h-12 w-full rounded-[var(--radius-sm)]" />
          <Skeleton className="my-3 h-12 w-full rounded-[var(--radius-sm)]" />
        </div>
      </div>
    </div>
  );
}

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

/**
 * Insights stack (CLS): About → filters bar → chips → period → Card KPIs →
 * growth heading+CTA → charts → growth list → timeline heading → timeline list.
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
      <Skeleton className="size-7 rounded-[var(--radius-sm)]" />
      <MoneyAnalyticsFiltersBarSkeleton triggerCount={2} />
      <div className="flex flex-wrap gap-1 rounded-[var(--radius-md)] border border-border p-1">
        <Skeleton className="h-11 w-20 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-11 w-20 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-11 w-24 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-11 w-24 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-11 w-28 rounded-[var(--radius-sm)]" />
      </div>
      <AnalyticsPeriodChipSkeleton />
      <section
        className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3"
        aria-hidden
      >
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={`insights-kpi-${index}`} className="px-4 py-4">
            <Skeleton className="h-4 w-20 rounded-[var(--radius-sm)]" />
            <Skeleton className="mt-2 h-8 w-24 max-w-full rounded-[var(--radius-sm)] sm:h-9" />
          </Card>
        ))}
      </section>
      <section className="space-y-3" aria-hidden>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-5 w-24 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-5 w-32 rounded-[var(--radius-sm)]" />
        </div>
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))",
          }}
        >
          <BabyGrowthChartSkeleton />
          <BabyGrowthChartSkeleton />
          <BabyGrowthChartSkeleton />
          <BabyGrowthChartSkeleton />
          <BabyGrowthChartSkeleton />
        </div>
        <div className="divide-y divide-border/80 border-y border-border/80">
          <Skeleton className="my-3 h-10 w-full rounded-[var(--radius-sm)]" />
          <Skeleton className="my-3 h-10 w-full rounded-[var(--radius-sm)]" />
        </div>
      </section>
      <section className="space-y-3" aria-hidden>
        <Skeleton className="h-5 w-28 rounded-[var(--radius-sm)]" />
        <div className="divide-y divide-border/80 border-y border-border/80">
          <Skeleton className="my-4 h-10 w-full rounded-[var(--radius-sm)]" />
          <Skeleton className="my-4 h-10 w-full rounded-[var(--radius-sm)]" />
          <Skeleton className="my-4 h-10 w-full rounded-[var(--radius-sm)]" />
        </div>
      </section>
    </div>
  );
}
