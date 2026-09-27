"use client";

import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Bar } from "@visx/shape";
import { useMemo, useState } from "react";
import {
  AnalyticsChartContainer,
  ChartViewportFallback,
} from "@/components/analytics-chart-card-shared";
import {
  CHART_CARD_HEIGHT_HALF,
  CHART_CARD_LAYOUT,
} from "@/components/analytics-chart-layout";
import { ChartParentSize } from "@/components/charts/chart-parent-size";
import { ChartShell } from "@/components/charts/chart-shell";
import { ChartLegendList } from "@/components/charts/chart-legend-list";
import {
  chartExpenseColor,
  chartIncomeColor,
} from "@/components/charts/chart-income-expense-colors";
import type { ChartTooltipPayload } from "@/components/charts/use-chart-tooltip";
import { useTheme } from "@/components/theme-provider";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { toggleSetKey } from "@/lib/chart-legend-toggle";
import {
  babyDrilldownForHydrationDay,
  type BabyChartDrilldownPayload,
} from "@/lib/baby-chart-drilldown";

export type HydrationChartDay = {
  date: string;
  wetCount: number;
  feedCount: number;
  formulaMl?: number | null;
};

type SeriesKey = "wet" | "feeds";

export function BabyHydrationChart({
  days,
  label,
  purpose,
  emptyLabel,
  wetLegendLabel,
  feedsLegendLabel,
  ready,
  onDrilldown,
}: {
  days: HydrationChartDay[];
  label: string;
  purpose: string;
  emptyLabel: string;
  wetLegendLabel: string;
  feedsLegendLabel: string;
  ready: boolean;
  onDrilldown?: (payload: BabyChartDrilldownPayload) => void;
}) {
  const { resolved, style } = useTheme();
  const wetColor = chartExpenseColor(resolved, style);
  const feedColor = chartIncomeColor(resolved, style);
  const [hidden, setHidden] = useState(() => new Set<SeriesKey>());

  const legendItems = useMemo(
    () => [
      {
        key: "wet",
        label: wetLegendLabel,
        color: wetColor,
        valueText: String(days.reduce((s, d) => s + d.wetCount, 0)),
      },
      {
        key: "feeds",
        label: feedsLegendLabel,
        color: feedColor,
        valueText: String(days.reduce((s, d) => s + d.feedCount, 0)),
      },
    ],
    [days, wetLegendLabel, feedsLegendLabel, wetColor, feedColor],
  );

  const allHidden = hidden.has("wet") && hidden.has("feeds");
  const hasData = ready && days.length > 0;

  return (
    <Card
      className={cn(CHART_CARD_LAYOUT, CHART_CARD_HEIGHT_HALF, "min-w-0 p-4")}
      data-testid="baby-hydration-chart"
    >
      <p className="mb-1 shrink-0 text-sm font-medium text-foreground">{label}</p>
      <p className="mb-2 shrink-0 text-xs text-muted">{purpose}</p>
      {!hasData ? (
        <p className="text-sm text-muted">{emptyLabel}</p>
      ) : (
        <AnalyticsChartContainer
          legendLayout="compact"
          legend={
            <ChartLegendList
              items={legendItems}
              hiddenKeys={hidden}
              onToggle={(key) =>
                setHidden((s) => toggleSetKey(s, key as SeriesKey))
              }
              showValues={false}
            />
          }
        >
          <ChartShell
            isEmpty={allHidden}
            emptyMessage="All series hidden — click legend to show"
          >
            {(tooltipApi) => (
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
                      hidden={hidden}
                      tooltipApi={tooltipApi}
                      onDrilldown={onDrilldown}
                    />
                  )
                }
              </ChartParentSize>
            )}
          </ChartShell>
        </AnalyticsChartContainer>
      )}
    </Card>
  );
}

function pointerPayload(
  e: React.PointerEvent,
  label: string,
  valueText: string,
): ChartTooltipPayload {
  return { label, valueText, clientX: e.clientX, clientY: e.clientY };
}

function HydrationInner({
  width,
  height,
  days,
  wetColor,
  feedColor,
  ariaLabel,
  hidden,
  tooltipApi,
  onDrilldown,
}: {
  width: number;
  height: number;
  days: HydrationChartDay[];
  wetColor: string;
  feedColor: string;
  ariaLabel: string;
  hidden: Set<SeriesKey>;
  tooltipApi: {
    showTooltip: (p: ChartTooltipPayload) => void;
    moveTooltip: (p: ChartTooltipPayload) => void;
    hideTooltip: () => void;
  };
  onDrilldown?: (payload: BabyChartDrilldownPayload) => void;
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
    ...days.map((d) =>
      Math.max(
        hidden.has("wet") ? 0 : d.wetCount,
        hidden.has("feeds") ? 0 : d.feedCount,
      ),
    ),
  );
  const y = scaleLinear({ domain: [0, maxY], range: [innerH, 0], nice: true });
  const band = x.bandwidth();
  const showWet = !hidden.has("wet");
  const showFeeds = !hidden.has("feeds");

  return (
    <svg width={width} height={height} role="img" aria-label={ariaLabel}>
      <Group left={margin.left} top={margin.top}>
        {days.map((d) => {
          const cx = x(d.date) ?? 0;
          const wetH = innerH - y(d.wetCount);
          const feedH = innerH - y(d.feedCount);
          return (
            <Group key={d.date}>
              {showWet ? (
                <Bar
                  x={cx}
                  y={y(d.wetCount)}
                  width={band / 2}
                  height={Math.max(0, wetH)}
                  fill={wetColor}
                  opacity={0.9}
                  rx={4}
                  className={onDrilldown ? "cursor-pointer" : undefined}
                  onPointerEnter={(ev) =>
                    tooltipApi.showTooltip(
                      pointerPayload(ev, `${d.date} · wet`, String(d.wetCount)),
                    )
                  }
                  onPointerMove={(ev) =>
                    tooltipApi.moveTooltip(
                      pointerPayload(ev, `${d.date} · wet`, String(d.wetCount)),
                    )
                  }
                  onPointerLeave={() => tooltipApi.hideTooltip()}
                  onClick={() => {
                    if (!onDrilldown) return;
                    onDrilldown(
                      babyDrilldownForHydrationDay({
                        day: d.date,
                        series: "wet",
                      }),
                    );
                  }}
                />
              ) : null}
              {showFeeds ? (
                <Bar
                  x={cx + band / 2}
                  y={y(d.feedCount)}
                  width={band / 2}
                  height={Math.max(0, feedH)}
                  fill={feedColor}
                  opacity={0.9}
                  rx={4}
                  className={onDrilldown ? "cursor-pointer" : undefined}
                  onPointerEnter={(ev) =>
                    tooltipApi.showTooltip(
                      pointerPayload(
                        ev,
                        `${d.date} · feeds`,
                        String(d.feedCount),
                      ),
                    )
                  }
                  onPointerMove={(ev) =>
                    tooltipApi.moveTooltip(
                      pointerPayload(
                        ev,
                        `${d.date} · feeds`,
                        String(d.feedCount),
                      ),
                    )
                  }
                  onPointerLeave={() => tooltipApi.hideTooltip()}
                  onClick={() => {
                    if (!onDrilldown) return;
                    onDrilldown(
                      babyDrilldownForHydrationDay({
                        day: d.date,
                        series: "feeds",
                      }),
                    );
                  }}
                />
              ) : null}
            </Group>
          );
        })}
      </Group>
    </svg>
  );
}
