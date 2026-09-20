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
import {
  BABY_HOME_BIG_CONTROL_MIN_H,
  BABY_HOME_SMALL_GRID_MIN_H,
} from "@/lib/baby-home-control-height";
import { SHELL_DASHBOARD_STACK, SHELL_FULL_SPAN } from "@/lib/shell-layout";
import {
  AnalyticsPeriodChipSkeleton,
  MoneyAnalyticsFiltersBarSkeleton,
} from "@/components/money-analytics-skeleton";

/** Matches Baby home: Row1 breast+bottle, Row2 nap+custom, Row3 diaper+custom,
 *  Row4 pump L/R + amount, then status, guidelines at page bottom. */
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
        className="grid gap-x-3 gap-y-2 [grid-template-rows:auto_auto_auto]"
        style={{
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
        }}
      >
        <div
          data-skeleton="section-breast"
          className="row-span-3 grid min-w-0 grid-rows-subgrid gap-y-2"
        >
          <Skeleton className="h-4 w-40 rounded-[var(--radius-sm)]" />
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 8rem), 1fr))",
            }}
          >
            <div className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border p-3",
              BABY_HOME_BIG_CONTROL_MIN_H,
            )}>
              <Skeleton className="size-6 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-5 w-20 rounded-[var(--radius-sm)]" />
            </div>
            <div className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border p-3",
              BABY_HOME_BIG_CONTROL_MIN_H,
            )}>
              <Skeleton className="size-6 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-5 w-20 rounded-[var(--radius-sm)]" />
            </div>
          </div>
          <Skeleton
            data-skeleton="section-footer"
            className="h-4 w-48 rounded-[var(--radius-sm)]"
          />
        </div>
        <div
          data-skeleton="section-bottle"
          className="row-span-3 grid min-w-0 grid-rows-subgrid gap-y-2"
        >
          <Skeleton className="h-4 w-40 rounded-[var(--radius-sm)]" />
          <div
            data-skeleton="bottle-ml-chips"
            className={cn(
              "grid grid-cols-2 grid-rows-2 gap-0 overflow-hidden rounded-[var(--radius-md)] border border-border",
              BABY_HOME_SMALL_GRID_MIN_H,
            )}
          >
            <Skeleton className="min-h-11 w-full rounded-none" />
            <Skeleton className="min-h-11 w-full rounded-none" />
            <Skeleton className="min-h-11 w-full rounded-none" />
            <Skeleton
              data-skeleton="custom-ml"
              className="min-h-11 w-full rounded-none"
            />
          </div>
          <Skeleton
            data-skeleton="section-footer"
            className="h-4 w-56 rounded-[var(--radius-sm)]"
          />
        </div>
      </div>

      <div
        data-skeleton="home-row-nap"
        className="grid gap-x-3 gap-y-2 [grid-template-rows:auto_auto_auto]"
        style={{
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        }}
      >
        <div
          data-skeleton="section-nap"
          className="row-span-2 grid min-w-0 grid-rows-subgrid gap-y-2"
        >
          <Skeleton className="h-4 w-40 rounded-[var(--radius-sm)]" />
          <div className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border p-3",
              BABY_HOME_BIG_CONTROL_MIN_H,
            )}>
            <Skeleton className="size-6 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-4 w-20 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-5 w-16 rounded-[var(--radius-sm)]" />
          </div>
        </div>
        <div
          data-skeleton="section-nap-custom-time"
          className="row-span-2 grid min-w-0 grid-rows-subgrid gap-y-2"
        >
          <div data-skeleton-header="empty" className="h-5" aria-hidden />
          <div className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border p-3",
              BABY_HOME_BIG_CONTROL_MIN_H,
            )}>
            <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-5 w-20 rounded-[var(--radius-sm)]" />
          </div>
        </div>
        <Skeleton
          data-skeleton="section-footer"
          className="col-span-full h-4 w-52 rounded-[var(--radius-sm)]"
        />
      </div>

      <div
        data-skeleton="home-row-diaper"
        className="grid gap-x-3 gap-y-2 [grid-template-rows:auto_auto_auto]"
        style={{
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        }}
      >
        <div
          data-skeleton="section-diaper"
          className="row-span-2 grid min-w-0 grid-rows-subgrid gap-y-2"
        >
          <Skeleton className="h-4 w-40 rounded-[var(--radius-sm)]" />
          <div
            data-skeleton="diaper-kind-2x2"
            className={cn(
              "grid grid-cols-2 grid-rows-2 gap-0 overflow-hidden rounded-[var(--radius-md)] border border-border",
              BABY_HOME_SMALL_GRID_MIN_H,
            )}
          >
            <Skeleton className="min-h-11 w-full rounded-none" />
            <Skeleton className="min-h-11 w-full rounded-none" />
            <Skeleton className="min-h-11 w-full rounded-none" />
            <Skeleton className="min-h-11 w-full rounded-none" />
          </div>
        </div>
        <div
          data-skeleton="section-diaper-custom-time"
          className="row-span-2 grid min-w-0 grid-rows-subgrid gap-y-2"
        >
          <div data-skeleton-header="empty" className="h-5" aria-hidden />
          <div
            data-skeleton="diaper-custom-time"
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border p-3",
              BABY_HOME_BIG_CONTROL_MIN_H,
            )}
          >
            <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-5 w-20 rounded-[var(--radius-sm)]" />
          </div>
        </div>
        <Skeleton
          data-skeleton="section-footer"
          className="col-span-full h-4 w-44 rounded-[var(--radius-sm)]"
        />
      </div>

      <div
        data-skeleton="home-row-pump"
        className="grid gap-x-3 gap-y-2 [grid-template-rows:auto_auto_auto]"
        style={{
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
        }}
      >
        <div
          data-skeleton="section-pump"
          className="row-span-3 grid min-w-0 grid-rows-subgrid gap-y-2"
        >
          <Skeleton
            data-skeleton="section-pump-header"
            className="h-4 w-40 rounded-[var(--radius-sm)]"
          />
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 8rem), 1fr))",
            }}
          >
            <div className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border p-3",
              BABY_HOME_BIG_CONTROL_MIN_H,
            )}>
              <Skeleton className="size-6 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-5 w-20 rounded-[var(--radius-sm)]" />
            </div>
            <div className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border p-3",
              BABY_HOME_BIG_CONTROL_MIN_H,
            )}>
              <Skeleton className="size-6 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-5 w-20 rounded-[var(--radius-sm)]" />
            </div>
          </div>
          <Skeleton
            data-skeleton="section-footer"
            className="h-4 w-48 rounded-[var(--radius-sm)]"
          />
        </div>
        <div
          data-skeleton="section-pump-amount"
          className="row-span-3 grid min-w-0 grid-rows-subgrid gap-y-2"
        >
          <Skeleton className="h-4 w-40 rounded-[var(--radius-sm)]" />
          <div
            data-skeleton="pump-amount-ml-chips"
            className={cn(
              "grid grid-cols-2 grid-rows-2 gap-0 overflow-hidden rounded-[var(--radius-md)] border border-border",
              BABY_HOME_SMALL_GRID_MIN_H,
            )}
          >
            <Skeleton className="min-h-11 w-full rounded-none" />
            <Skeleton className="min-h-11 w-full rounded-none" />
            <Skeleton className="min-h-11 w-full rounded-none" />
            <Skeleton className="min-h-11 w-full rounded-none" />
          </div>
          <div
            data-skeleton="section-footer"
            data-skeleton-footer="empty"
          />
        </div>
      </div>

      <div className="space-y-3" data-skeleton="home-status">
        <div className="flex items-start gap-2 border-b border-border/70 pb-3">
          <Skeleton className="mt-0.5 size-5 shrink-0 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-5 w-full max-w-sm rounded-[var(--radius-sm)]" />
        </div>
        <div className="flex items-start gap-2 border-b border-border/70 pb-3">
          <Skeleton className="mt-0.5 size-5 shrink-0 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-5 w-full max-w-xs rounded-[var(--radius-sm)]" />
        </div>
        <div className="flex items-start gap-2 border-b border-border/70 pb-3">
          <Skeleton className="mt-0.5 size-5 shrink-0 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-5 w-full max-w-sm rounded-[var(--radius-sm)]" />
        </div>
        <div className="flex items-start gap-2">
          <Skeleton className="mt-0.5 size-5 shrink-0 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-5 w-full max-w-sm rounded-[var(--radius-sm)]" />
        </div>
      </div>

      <div data-skeleton="home-row-guidelines">
        {/* Mirrors live BabyCareGuidelines: Section I/II headers collapsed + caveat. */}
        <div
          data-skeleton="guideline-quiet-block"
          className="space-y-1 rounded-[var(--radius-md)] border border-border/60 bg-surface p-3"
        >
          <div
            data-skeleton="guideline-section-i"
            className="flex min-h-11 items-center"
          >
            <Skeleton className="h-4 w-56 rounded-[var(--radius-sm)]" />
          </div>

          <div
            data-skeleton="guideline-section-ii"
            className="flex min-h-11 items-center border-t border-border/40"
          >
            <Skeleton className="h-4 w-64 rounded-[var(--radius-sm)]" />
          </div>

          <Skeleton
            data-skeleton="guide-caveat"
            className="h-3 w-full max-w-lg rounded-[var(--radius-sm)] border-t border-border/40 pt-3"
          />
        </div>
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
            "grid grid-cols-2 grid-rows-2 gap-0 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface",
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

/** Pump L/R nested pair (12rem section) + pump amount ml chips. */
export function BabyPumpSkeleton() {
  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
      aria-hidden
      data-testid="baby-pump-page-skeleton"
    >
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
        }}
        data-skeleton="pump-timer-chips"
      >
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 8rem), 1fr))",
          }}
        >
          <Skeleton className="min-h-14 rounded-[var(--radius-md)]" />
          <Skeleton className="min-h-14 rounded-[var(--radius-md)]" />
        </div>
        <div
          className={cn(
            "grid grid-cols-2 grid-rows-2 gap-0 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface",
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

/** Diaper 2×2 kind + Nap-sized Custom time sibling (log form parity). */
export function BabyDiaperSkeleton() {
  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
      aria-hidden
      data-testid="baby-diaper-page-skeleton"
    >
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        }}
        data-skeleton="diaper-form-row"
      >
        <div
          className={cn(
            "grid grid-cols-2 grid-rows-2 gap-0 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface",
            BABY_HOME_SMALL_GRID_MIN_H,
          )}
          data-skeleton="diaper-kind-2x2"
        >
          <Skeleton className="min-h-11 w-full rounded-none" />
          <Skeleton className="min-h-11 w-full rounded-none" />
          <Skeleton className="min-h-11 w-full rounded-none" />
          <Skeleton className="min-h-11 w-full rounded-none" />
        </div>
        <div
          data-skeleton="diaper-custom-time"
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border p-3",
            BABY_HOME_BIG_CONTROL_MIN_H,
          )}
        >
          <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-5 w-20 rounded-[var(--radius-sm)]" />
        </div>
      </div>
    </div>
  );
}

/** Open-session hint + Nap TimedCareChip + Nap-sized Custom time sibling. */
export function BabySleepSkeleton() {
  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
      aria-hidden
      data-testid="baby-sleep-page-skeleton"
    >
      <Skeleton className="h-5 w-40 rounded-[var(--radius-sm)]" />
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        }}
        data-skeleton="sleep-action-chips"
      >
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border p-3",
            BABY_HOME_BIG_CONTROL_MIN_H,
          )}
        >
          <Skeleton className="size-6 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-4 w-20 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-5 w-16 rounded-[var(--radius-sm)]" />
        </div>
        <div
          data-skeleton="sleep-custom-time"
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border p-3",
            BABY_HOME_BIG_CONTROL_MIN_H,
          )}
        >
          <Skeleton className="h-4 w-16 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-5 w-20 rounded-[var(--radius-sm)]" />
        </div>
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
