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
import { useTheme } from "@/components/theme-provider";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export type NightRestChartDay = {
  date: string;
  nightSleepMinutes: number;
  intervalCount: number;
};

export function BabyNightRestChart({
  days,
  label,
  purpose,
  emptyLabel,
  blocksLabel,
  ready,
}: {
  days: NightRestChartDay[];
  label: string;
  purpose: string;
  emptyLabel: string;
  /** Shown with interval count when a day has more than one sleep block. */
  blocksLabel: string;
  ready: boolean;
}) {
  const { resolved, style } = useTheme();
  const color = colorByIndex(resolved, 0, style);
  const multiBlockDays = days.filter((d) => d.intervalCount > 1);

  return (
    <Card
      className={cn(CHART_CARD_LAYOUT, CHART_CARD_HEIGHT_HALF, "p-4")}
      data-testid="baby-night-rest-chart"
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
                    <NightRestInner
                      width={width}
                      height={height}
                      days={days}
                      color={color}
                      ariaLabel={label}
                    />
                  )
                }
              </ChartParentSize>
            </div>
          </div>
          {multiBlockDays.length > 0 ? (
            <ul
              className="mt-2 space-y-1 text-xs text-muted"
              data-testid="baby-night-rest-intervals"
            >
              {multiBlockDays.map((d) => (
                <li key={d.date}>
                  {d.date}: {d.intervalCount} {blocksLabel}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </Card>
  );
}

function NightRestInner({
  width,
  height,
  days,
  color,
  ariaLabel,
}: {
  width: number;
  height: number;
  days: NightRestChartDay[];
  color: string;
  ariaLabel: string;
}) {
  const margin = { top: 8, right: 8, bottom: 28, left: 36 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const x = scaleBand({
    domain: days.map((d) => d.date),
    range: [0, innerW],
    padding: 0.3,
  });
  const maxY = Math.max(60, ...days.map((d) => d.nightSleepMinutes));
  const y = scaleLinear({ domain: [0, maxY], range: [innerH, 0], nice: true });

  return (
    <svg width={width} height={height} role="img" aria-label={ariaLabel}>
      <Group left={margin.left} top={margin.top}>
        {days.map((d) => {
          const cx = x(d.date) ?? 0;
          const barH = innerH - y(d.nightSleepMinutes);
          return (
            <Bar
              key={d.date}
              x={cx}
              y={y(d.nightSleepMinutes)}
              width={x.bandwidth()}
              height={Math.max(0, barH)}
              fill={color}
              opacity={0.9}
              rx={4}
            />
          );
        })}
      </Group>
    </svg>
  );
}
