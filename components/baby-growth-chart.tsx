"use client";

import { Group } from "@visx/group";
import { scaleLinear, scaleTime } from "@visx/scale";
import { LinePath } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { useMemo } from "react";
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
import { BabyGrowthChartSkeleton } from "@/components/baby-page-skeleton";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export function BabyGrowthChart({
  points,
  label,
  emptyLabel,
  partialNote = null,
  ready,
}: {
  points: Array<{ x: number; y: number }>;
  label: string;
  /** Caller must pass a localized string (e.g. `t("growth.noData")`). */
  emptyLabel: string;
  /** Shown under the chart when loaded data is incomplete. */
  partialNote?: string | null;
  ready: boolean;
}) {
  const { resolved, style } = useTheme();
  const stroke = colorByIndex(resolved, 0, style);

  if (!ready) return <BabyGrowthChartSkeleton />;

  return (
    <Card
      className={cn(CHART_CARD_LAYOUT, CHART_CARD_HEIGHT_HALF, "p-4")}
      data-testid="baby-growth-chart-card"
    >
      <p className="mb-2 shrink-0 text-sm font-medium text-foreground">{label}</p>
      {points.length === 0 ? (
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
                    <BabyGrowthChartInner
                      width={width}
                      height={height}
                      points={points}
                      stroke={stroke}
                      ariaLabel={label}
                    />
                  )
                }
              </ParentSize>
            </AnalyticsChartContainer>
          </div>
          {partialNote ? (
            <p className="mt-2 text-xs text-muted">{partialNote}</p>
          ) : null}
        </>
      )}
    </Card>
  );
}

function BabyGrowthChartInner({
  width,
  height,
  points,
  stroke,
  ariaLabel,
}: {
  width: number;
  height: number;
  points: Array<{ x: number; y: number }>;
  stroke: string;
  ariaLabel: string;
}) {
  const margin = { top: 8, right: 8, bottom: 20, left: 36 };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);

  const xScale = useMemo(
    () =>
      scaleTime({
        domain: [
          Math.min(...points.map((p) => p.x)),
          Math.max(...points.map((p) => p.x)),
        ],
        range: [0, innerW],
      }),
    [points, innerW],
  );

  const yScale = useMemo(() => {
    const ys = points.map((p) => p.y);
    const min = Math.min(...ys);
    const max = Math.max(...ys);
    const pad = (max - min) * 0.1 || 1;
    return scaleLinear({
      domain: [min - pad, max + pad],
      range: [innerH, 0],
      nice: true,
    });
  }, [points, innerH]);

  return (
    <svg width={width} height={height} role="img" aria-label={ariaLabel}>
      <Group left={margin.left} top={margin.top}>
        <LinePath
          data={points}
          x={(d) => xScale(d.x) ?? 0}
          y={(d) => yScale(d.y) ?? 0}
          stroke={stroke}
          strokeWidth={2}
          curve={curveMonotoneX}
        />
      </Group>
    </svg>
  );
}
