"use client";

import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Bar } from "@visx/shape";
import { ChartViewportFallback } from "@/components/analytics-chart-card-shared";
import {
  CHART_CARD_HEIGHT_HALF,
  CHART_CARD_LAYOUT,
} from "@/components/analytics-chart-layout";
import { ChartParentSize } from "@/components/charts/chart-parent-size";
import { colorByIndex } from "@/components/charts/chart-colors";
import {
  chartExpenseColor,
  chartIncomeColor,
} from "@/components/charts/chart-income-expense-colors";
import { useTheme } from "@/components/theme-provider";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export type HydrationChartDay = {
  date: string;
  wetCount: number;
  feedCount: number;
  formulaMl?: number | null;
};

export function BabyHydrationChart({
  days,
  label,
  purpose,
  emptyLabel,
  wetLegendLabel,
  feedsLegendLabel,
  ready,
}: {
  days: HydrationChartDay[];
  label: string;
  purpose: string;
  emptyLabel: string;
  wetLegendLabel: string;
  feedsLegendLabel: string;
  ready: boolean;
}) {
  const { resolved, style } = useTheme();
  // Same dual-series pair as money Monthly expense/income columns.
  const wetColor = chartExpenseColor(resolved, style);
  const feedColor = chartIncomeColor(resolved, style);

  return (
    <Card
      className={cn(CHART_CARD_LAYOUT, CHART_CARD_HEIGHT_HALF, "p-4")}
      data-testid="baby-hydration-chart"
    >
      <p className="mb-1 shrink-0 text-sm font-medium text-foreground">{label}</p>
      <p className="mb-2 shrink-0 text-xs text-muted">{purpose}</p>
      {!ready || days.length === 0 ? (
        <p className="text-sm text-muted">{emptyLabel}</p>
      ) : (
        <>
          <div className="relative h-[11.5rem] min-h-[11.5rem] w-full min-w-0 overflow-hidden">
            <div className="absolute inset-0 min-h-0 min-w-0">
              <ChartParentSize>
                {({ width, height }) =>
                  width < 10 || height < 10 ? (
                    <ChartViewportFallback ariaLabel={label} />
                  ) : (
                    <HydrationInner
                      width={width}
                      height={height}
                      days={days}
                      wetColor={wetColor}
                      feedColor={feedColor}
                      ariaLabel={label}
                    />
                  )
                }
              </ChartParentSize>
            </div>
          </div>
          <ul className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
            <li className="inline-flex items-center gap-1.5">
              <span
                className="inline-block size-2.5 rounded-[var(--radius-sm)]"
                style={{ backgroundColor: wetColor }}
                aria-hidden
              />
              {wetLegendLabel}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span
                className="inline-block size-2.5 rounded-[var(--radius-sm)]"
                style={{ backgroundColor: feedColor }}
                aria-hidden
              />
              {feedsLegendLabel}
            </li>
          </ul>
        </>
      )}
    </Card>
  );
}

function HydrationInner({
  width,
  height,
  days,
  wetColor,
  feedColor,
  ariaLabel,
}: {
  width: number;
  height: number;
  days: HydrationChartDay[];
  wetColor: string;
  feedColor: string;
  ariaLabel: string;
}) {
  const margin = { top: 8, right: 8, bottom: 28, left: 28 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const x = scaleBand({
    domain: days.map((d) => d.date),
    range: [0, innerW],
    padding: 0.25,
  });
  const maxY = Math.max(
    6,
    ...days.map((d) => Math.max(d.wetCount, d.feedCount)),
  );
  const y = scaleLinear({ domain: [0, maxY], range: [innerH, 0], nice: true });
  const band = x.bandwidth();

  return (
    <svg width={width} height={height} role="img" aria-label={ariaLabel}>
      <Group left={margin.left} top={margin.top}>
        {days.map((d) => {
          const cx = x(d.date) ?? 0;
          const wetH = innerH - y(d.wetCount);
          const feedH = innerH - y(d.feedCount);
          return (
            <Group key={d.date}>
              <Bar
                x={cx}
                y={y(d.wetCount)}
                width={band / 2}
                height={Math.max(0, wetH)}
                fill={wetColor}
                opacity={0.9}
                rx={4}
              />
              <Bar
                x={cx + band / 2}
                y={y(d.feedCount)}
                width={band / 2}
                height={Math.max(0, feedH)}
                fill={feedColor}
                opacity={0.9}
                rx={4}
              />
            </Group>
          );
        })}
      </Group>
    </svg>
  );
}
