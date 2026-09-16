"use client";

import { Group } from "@visx/group";
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

export type PatternFinderDay = {
  date: string;
  sleepBlocks: Array<{ startMin: number; endMin: number }>;
  markers: Array<{ minuteOfDay: number; kind: string }>;
};

/** Custom day×24h matrix — not column/line. */
export function BabyPatternFinderChart({
  days,
  label,
  purpose,
  emptyLabel,
  ready,
}: {
  days: PatternFinderDay[];
  label: string;
  purpose: string;
  emptyLabel: string;
  ready: boolean;
}) {
  const { resolved, style } = useTheme();
  const sleepColor = colorByIndex(resolved, 0, style);
  const markerColor = colorByIndex(resolved, 2, style);

  return (
    <Card
      className={cn(CHART_CARD_LAYOUT, CHART_CARD_HEIGHT_HALF, "p-4")}
      data-testid="baby-pattern-finder-chart"
    >
      <p className="mb-1 shrink-0 text-sm font-medium text-foreground">{label}</p>
      <p className="mb-2 shrink-0 text-xs text-muted">{purpose}</p>
      {!ready || days.length === 0 ? (
        <p className="text-sm text-muted">{emptyLabel}</p>
      ) : (
        <div className="relative h-[11.5rem] min-h-[11.5rem] w-full min-w-0 overflow-hidden">
          <div className="absolute inset-0 min-h-0 min-w-0">
            <ChartParentSize>
              {({ width, height }) =>
                width < 10 || height < 10 ? (
                  <ChartViewportFallback ariaLabel={label} />
                ) : (
                  <MatrixInner
                    width={width}
                    height={height}
                    days={days}
                    sleepColor={sleepColor}
                    markerColor={markerColor}
                    ariaLabel={label}
                  />
                )
              }
            </ChartParentSize>
          </div>
        </div>
      )}
    </Card>
  );
}

function MatrixInner({
  width,
  height,
  days,
  sleepColor,
  markerColor,
  ariaLabel,
}: {
  width: number;
  height: number;
  days: PatternFinderDay[];
  sleepColor: string;
  markerColor: string;
  ariaLabel: string;
}) {
  const margin = { top: 4, right: 4, bottom: 4, left: 56 };
  const innerW = width - margin.left - margin.right;
  const rowH = Math.max(12, (height - margin.top - margin.bottom) / days.length);

  return (
    <svg width={width} height={height} role="img" aria-label={ariaLabel}>
      <Group left={margin.left} top={margin.top}>
        {days.map((d, i) => {
          const y = i * rowH;
          return (
            <Group key={d.date}>
              <text
                x={-8}
                y={y + rowH / 2}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted text-[10px]"
              >
                {d.date.slice(5)}
              </text>
              <rect
                x={0}
                y={y + 2}
                width={innerW}
                height={rowH - 4}
                className="fill-muted-surface"
                rx={2}
              />
              {d.sleepBlocks.map((b, bi) => (
                <Bar
                  key={`${d.date}-s-${bi}`}
                  x={(b.startMin / 1440) * innerW}
                  y={y + 4}
                  width={Math.max(1, ((b.endMin - b.startMin) / 1440) * innerW)}
                  height={rowH - 8}
                  fill={sleepColor}
                  opacity={0.7}
                  rx={1}
                />
              ))}
              {d.markers.map((m, mi) => (
                <circle
                  key={`${d.date}-m-${mi}`}
                  cx={(m.minuteOfDay / 1440) * innerW}
                  cy={y + rowH / 2}
                  r={2.5}
                  fill={markerColor}
                />
              ))}
            </Group>
          );
        })}
      </Group>
    </svg>
  );
}
