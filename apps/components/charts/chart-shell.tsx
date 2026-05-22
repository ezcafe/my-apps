"use client";

import type { ReactNode } from "react";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { useChartTooltip } from "@/components/charts/use-chart-tooltip";

/** Relative wrapper for charts that need hover tooltips. */
export function ChartShell({
  children,
  className,
  emptyMessage,
  isEmpty,
}: {
  children: (api: ReturnType<typeof useChartTooltip>) => ReactNode;
  className?: string;
  emptyMessage?: string;
  isEmpty?: boolean;
}) {
  const tooltipApi = useChartTooltip();

  return (
    <div className={className ?? "relative size-full min-h-0 min-w-0"}>
      {isEmpty && emptyMessage ? (
        <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-muted">
          {emptyMessage}
        </p>
      ) : (
        children(tooltipApi)
      )}
      <ChartTooltip tooltip={tooltipApi.tooltip} />
    </div>
  );
}
