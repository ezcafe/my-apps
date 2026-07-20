"use client";

import { Group } from "@visx/group";
import Pie from "@visx/shape/lib/shapes/Pie";
import { ParentSize } from "@visx/responsive";
import { useMemo } from "react";
import { colorByIndex } from "@/components/charts/chart-colors";
import { ChartShell } from "@/components/charts/chart-shell";
import type { ChartTooltipPayload } from "@/components/charts/use-chart-tooltip";
import type { StylePreset } from "@/components/theme-provider";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/cn";

type Datum = { label: string; valueMinor: number; categoryId?: string | null };

export type PieChartDatum = Datum;

export type PieChartItemClickPayload = {
  label: string;
  categoryId: string | null;
};

function pointerPayload(
  e: React.PointerEvent,
  label: string,
  valueText: string,
): ChartTooltipPayload {
  return { label, valueText, clientX: e.clientX, clientY: e.clientY };
}

export function PieByCategoryChart({
  data,
  hiddenLabels,
  hoveredLabel,
  animate = true,
  formatValue,
  centerTotalMinor,
  centerLabel = "Total",
  emptyMessage = "All categories hidden — click legend to show",
  onItemClick,
}: {
  data: Datum[];
  hiddenLabels?: Set<string>;
  hoveredLabel?: string | null;
  animate?: boolean;
  formatValue: (minor: number) => string;
  centerTotalMinor?: number;
  centerLabel?: string;
  emptyMessage?: string;
  onItemClick?: (item: PieChartItemClickPayload) => void;
}) {
  const { resolved, style } = useTheme();
  const visibleData = useMemo(
    () => data.filter((d) => d.valueMinor > 0 && !hiddenLabels?.has(d.label)),
    [data, hiddenLabels],
  );
  const allHidden =
    data.some((d) => d.valueMinor > 0) &&
    visibleData.length === 0;

  return (
    <ChartShell isEmpty={allHidden} emptyMessage={emptyMessage}>
      {(tooltipApi) => (
        <ParentSize className="size-full min-h-0 min-w-0">
          {({ width, height }) =>
            width > 0 && height > 0 ? (
              <PieInner
                width={width}
                height={height}
                data={visibleData}
                allData={data}
                resolved={resolved}
                stylePreset={style}
                hoveredLabel={hoveredLabel}
                animate={animate}
                formatValue={formatValue}
                centerTotalMinor={centerTotalMinor}
                centerLabel={centerLabel}
                tooltipApi={tooltipApi}
                onItemClick={onItemClick}
              />
            ) : null
          }
        </ParentSize>
      )}
    </ChartShell>
  );
}

function PieInner({
  width,
  height,
  data,
  allData,
  resolved,
  stylePreset,
  hoveredLabel,
  animate,
  formatValue,
  centerTotalMinor,
  centerLabel,
  tooltipApi,
  onItemClick,
}: {
  width: number;
  height: number;
  data: Datum[];
  allData: Datum[];
  resolved: "light" | "dark";
  stylePreset: StylePreset;
  hoveredLabel?: string | null;
  animate?: boolean;
  formatValue: (minor: number) => string;
  centerTotalMinor?: number;
  centerLabel?: string;
  tooltipApi: {
    showTooltip: (p: ChartTooltipPayload) => void;
    moveTooltip: (p: ChartTooltipPayload) => void;
    hideTooltip: () => void;
  };
  onItemClick?: (item: PieChartItemClickPayload) => void;
}) {
  const radius = Math.min(width, height) / 2 - 12;
  const centerY = height / 2;
  const centerX = width / 2;
  const origColorIndex = useMemo(() => {
    const map = new Map<string, number>();
    let i = 0;
    for (const d of allData.filter((x) => x.valueMinor > 0)) {
      map.set(d.label, i);
      i += 1;
    }
    return map;
  }, [allData]);

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="block max-w-full"
      role="img"
      aria-label="Category breakdown donut chart"
    >
      <Group top={centerY} left={centerX}>
        <Pie data={data} pieValue={(d) => d.valueMinor} outerRadius={radius} innerRadius={radius * 0.55} padAngle={0.02}>
          {(provided) =>
            provided.arcs.map((arc, i) => {
              const label = arc.data.label;
              const colorIdx = origColorIndex.get(label) ?? i;
              const fill = colorByIndex(resolved, colorIdx, stylePreset);
              const hovered = hoveredLabel === label;
              const dimmed = hoveredLabel != null && hoveredLabel !== "" && !hovered;
              const valueText = formatValue(arc.data.valueMinor);
              return (
                <g key={`arc-${label}-${i}`}>
                  <path
                    d={provided.path(arc) ?? ""}
                    fill={fill}
                    className={cn(
                      "transition-[opacity,transform] duration-150",
                      animate && "fx-chart-arc-pop",
                      dimmed && "opacity-35",
                    )}
                    style={
                      animate
                        ? { animationDelay: `${i * 50}ms`, opacity: hovered ? 1 : 0.9 }
                        : { opacity: hovered ? 1 : dimmed ? 0.35 : 0.9 }
                    }
                    pointerEvents="none"
                  />
                  <path
                    d={provided.path(arc) ?? ""}
                    fill="transparent"
                    stroke="transparent"
                    strokeWidth={14}
                    pointerEvents="all"
                    className={cn(onItemClick ? "cursor-pointer" : "cursor-default")}
                    onPointerEnter={(e) =>
                      tooltipApi.showTooltip(pointerPayload(e, label, valueText))
                    }
                    onPointerMove={(e) =>
                      tooltipApi.moveTooltip(pointerPayload(e, label, valueText))
                    }
                    onPointerLeave={() => tooltipApi.hideTooltip()}
                    onClick={() => {
                      if (!onItemClick) return;
                      onItemClick({
                        label,
                        categoryId: arc.data.categoryId ?? null,
                      });
                    }}
                  />
                </g>
              );
            })
          }
        </Pie>
        {centerTotalMinor != null && centerTotalMinor > 0 ? (
          <>
            <text
              textAnchor="middle"
              y={-6}
              className="fill-muted text-[10px] font-medium"
            >
              {centerLabel}
            </text>
            <text
              textAnchor="middle"
              y={12}
              className="fill-foreground text-sm font-semibold tabular-nums"
            >
              {formatValue(centerTotalMinor)}
            </text>
          </>
        ) : null}
      </Group>
    </svg>
  );
}
