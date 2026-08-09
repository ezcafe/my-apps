"use client";

import type { ReactNode } from "react";
import { AnalyticsEmptyState } from "@/components/analytics-empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalyticsChartDrilldownPayload } from "@/lib/analytics-build-query";
import type { StylePreset } from "@/components/theme-provider";

export const CHART_EMPTY_TRANSACTION_ACTIONS = {
  action: { href: "/money/spending", label: "View transactions" },
  secondaryAction: { href: "/money/new", label: "Add transaction" },
} as const;

const LEGEND_GRID_DEFAULT =
  "grid-cols-1 grid-rows-[minmax(0,1fr)_auto] md:grid-rows-1 md:[grid-template-columns:minmax(0,20%)_minmax(0,80%)]";
const LEGEND_GRID_COMPACT =
  "grid-cols-1 grid-rows-[minmax(0,1fr)_auto] md:grid-rows-1 md:[grid-template-columns:minmax(0,5.5rem)_minmax(0,1fr)]";

export function AnalyticsChartContainer({
  className,
  legend,
  legendLayout = "default",
  children,
}: {
  className?: string;
  legend?: ReactNode;
  /** `compact` uses a fixed narrow legend column for short labels. */
  legendLayout?: "default" | "compact";
  children: ReactNode;
}) {
  /* Flex fill (not absolute inset-0): Safari often reports 0 height for
     percentage/absolute descendants inside size-contained or grid 1fr rows,
     which leaves visx ParentSize blank. */
  const chartSlot = (
    <div
      className={[
        "relative flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden place-self-stretch",
        legend ? "order-1 md:order-2" : null,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );

  if (!legend) {
    return (
      <div
        className={[
          "analytics-chart-container grid min-h-0 w-full flex-1 overflow-hidden grid-cols-[minmax(0,1fr)]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {chartSlot}
      </div>
    );
  }

  return (
    <div
      className={[
        "analytics-chart-container grid min-h-0 w-full flex-1 overflow-hidden",
        legendLayout === "compact" ? LEGEND_GRID_COMPACT : LEGEND_GRID_DEFAULT,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {chartSlot}
      <div className="analytics-chart-legend-slot order-2 min-h-0 min-w-0 max-md:overflow-x-auto max-md:overscroll-x-contain border-t border-border/60 pt-2 md:order-1 md:overflow-y-auto md:overscroll-contain md:border-t-0 md:border-r md:pt-0 md:pr-2">
        {legend}
      </div>
    </div>
  );
}

export function ChartViewportFallback({ ariaLabel }: { ariaLabel: string }) {
  return (
    <Skeleton
      className="flex h-full w-full min-h-0 min-w-0 items-center justify-center rounded-[var(--radius-sm)] text-xs text-muted"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      Chart loads when visible
    </Skeleton>
  );
}

export function DeferredChartLoading({ ariaLabel }: { ariaLabel: string }) {
  return (
    <Skeleton
      className="flex h-full w-full min-h-0 min-w-0 items-center justify-center rounded-[var(--radius-sm)] text-xs text-muted"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      Loading chart data…
    </Skeleton>
  );
}

export type ThemeSlice = {
  resolved: "light" | "dark";
  style: StylePreset;
};

export type ChartDrilldownHandler = (payload: AnalyticsChartDrilldownPayload) => void;

export { AnalyticsEmptyState };
