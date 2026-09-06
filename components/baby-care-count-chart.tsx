"use client";

import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Bar } from "@visx/shape";
import { ParentSize } from "@visx/responsive";
import {
  AnalyticsChartContainer,
  ChartViewportFallback,
} from "@/components/analytics-chart-card-shared";
import {
  CHART_CARD_HEIGHT_HALF,
  CHART_CARD_LAYOUT,
  CHART_SLOT_CLASS,
} from "@/components/analytics-chart-layout";
import { colorByIndex } from "@/components/charts/chart-colors";
import { useTheme } from "@/components/theme-provider";
import { Card } from "@/components/ui/card";
import type { BabyCareCountDay } from "@/lib/baby-care-counts";
import { cn } from "@/lib/cn";

type SeriesKey = "feed" | "sleep" | "diaper";

const SERIES: SeriesKey[] = ["feed", "sleep", "diaper"];

export function BabyCareCountChart({
  days,
  label,
  emptyLabel,
  partialNote = null,
  seriesLabels,
  ready,
}: {
  days: BabyCareCountDay[];
  label: string;
  emptyLabel: string;
  /** Shown under the chart when loaded data is incomplete. */
  partialNote?: string | null;
  seriesLabels: Record<SeriesKey, string>;
  ready: boolean;
}) {
  const { resolved, style } = useTheme();
  const colors = SERIES.map((_, i) => colorByIndex(resolved, i, style));

  return (
    <Card
      className={cn(CHART_CARD_LAYOUT, CHART_CARD_HEIGHT_HALF, "p-4")}
      data-testid="baby-care-count-chart"
    >
      <p className="mb-2 shrink-0 text-sm font-medium text-foreground">{label}</p>
      {!ready || days.length === 0 ? (
        <p className="text-sm text-muted">{emptyLabel}</p>
      ) : (
        <>
          <div className={cn(CHART_SLOT_CLASS, "flex-1")}>
            <AnalyticsChartContainer>
              <ParentSize>
                {({ width, height }) =>
                  width < 10 || height < 10 ? (
                    <ChartViewportFallback ariaLabel={label} />
                  ) : (
                    <BabyCareCountChartInner
                      width={width}
                      height={height}
                      days={days}
                      colors={colors}
                      ariaLabel={label}
                    />
                  )
                }
              </ParentSize>
            </AnalyticsChartContainer>
          </div>
          <ul className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
            {SERIES.map((key, i) => (
              <li key={key} className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block size-2.5 rounded-[var(--radius-sm)]"
                  style={{ backgroundColor: colors[i] }}
                  aria-hidden
                />
                {seriesLabels[key]}
              </li>
            ))}
          </ul>
          {partialNote ? (
            <p className="mt-2 text-xs text-muted">{partialNote}</p>
          ) : null}
        </>
      )}
    </Card>
  );
}

function BabyCareCountChartInner({
  width,
  height,
  days,
  colors,
  ariaLabel,
}: {
  width: number;
  height: number;
  days: BabyCareCountDay[];
  colors: string[];
  ariaLabel: string;
}) {
  const margin = { top: 8, right: 8, bottom: 28, left: 28 };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);

  const xScale = scaleBand({
    domain: days.map((d) => d.day),
    range: [0, innerW],
    padding: 0.2,
  });
  const group = scaleBand({
    domain: SERIES,
    range: [0, xScale.bandwidth()],
    padding: 0.1,
  });
  const maxY = Math.max(
    1,
    ...days.flatMap((d) => [d.feed, d.sleep, d.diaper]),
  );
  const yScale = scaleLinear({
    domain: [0, maxY],
    range: [innerH, 0],
    nice: true,
  });

  return (
    <svg width={width} height={height} role="img" aria-label={ariaLabel}>
      <Group left={margin.left} top={margin.top}>
        {days.map((day) =>
          SERIES.map((key, i) => {
            const x0 = xScale(day.day) ?? 0;
            const x = x0 + (group(key) ?? 0);
            const value = day[key];
            const barH = innerH - (yScale(value) ?? 0);
            return (
              <Bar
                key={`${day.day}-${key}`}
                x={x}
                y={yScale(value) ?? 0}
                width={group.bandwidth()}
                height={Math.max(0, barH)}
                fill={colors[i]}
                rx={2}
              />
            );
          }),
        )}
      </Group>
    </svg>
  );
}
