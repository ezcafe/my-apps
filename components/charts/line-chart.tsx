"use client";

import { curveMonotoneX } from "@visx/curve";
import { Group } from "@visx/group";
import { LinePath } from "@visx/shape";
import { ParentSize } from "@visx/responsive";
import { scaleLinear, scalePoint } from "@visx/scale";
import { useId, useLayoutEffect, useMemo, useRef } from "react";
import {
  chartExpenseColor,
  chartIncomeColor,
} from "@/components/charts/chart-income-expense-colors";
import { ChartShell } from "@/components/charts/chart-shell";
import type { ChartTooltipPayload } from "@/components/charts/use-chart-tooltip";
import type { StylePreset } from "@/components/theme-provider";
import { useTheme } from "@/components/theme-provider";
import { useFormatDate } from "@/lib/format-date";
import { prefersReducedMotion } from "@/lib/microinteractions";

export type NetFlowPoint = {
  date: string;
  netMinor: number;
};

export type NetFlowComparison = {
  label: string;
  data: NetFlowPoint[];
};

function xTickIndices(length: number, maxTicks: number): number[] {
  if (length <= 0) return [];
  if (length <= maxTicks) return [...Array(length).keys()];
  const out: number[] = [0];
  const innerSlots = maxTicks - 2;
  const span = length - 1;
  if (innerSlots <= 0) {
    out.push(length - 1);
    return [...new Set(out)].sort((a, b) => a - b);
  }
  const step = Math.max(1, Math.ceil(span / (innerSlots + 1)));
  for (let i = step; i < length - 1; i += step) out.push(i);
  if (out[out.length - 1] !== length - 1) out.push(length - 1);
  return [...new Set(out)].sort((a, b) => a - b);
}

function currentMonthDayDomain(): string[] {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Array.from({ length: lastDay }, (_, i) => String(i + 1));
}

function netLineColor(
  netValues: number[],
  resolved: "light" | "dark",
  stylePreset: StylePreset,
): string {
  const last = netValues[netValues.length - 1] ?? 0;
  if (last < 0) return chartExpenseColor(resolved, stylePreset);
  return chartIncomeColor(resolved, stylePreset);
}

function pointerPayload(
  e: React.PointerEvent,
  label: string,
  valueText: string,
): ChartTooltipPayload {
  return { label, valueText, clientX: e.clientX, clientY: e.clientY };
}

export function LineChart({
  data,
  comparison,
  xMode = "date",
  formatY,
  formatXLabel,
  hiddenSeries,
  animate = true,
  emptyMessage = "All series hidden — click legend to show",
}: {
  data: NetFlowPoint[];
  comparison?: NetFlowComparison;
  xMode?: "date" | "dayOfMonth";
  formatY: (minor: number) => string;
  formatXLabel?: (key: string) => string;
  hiddenSeries?: Set<"primary" | "compare">;
  animate?: boolean;
  emptyMessage?: string;
}) {
  const { resolved, style } = useTheme();
  const { formatChartDateTick } = useFormatDate();
  const formatX = formatXLabel ?? formatChartDateTick;
  const clipId = useId().replace(/:/g, "");
  const hidePrimary = hiddenSeries?.has("primary") ?? false;
  const hideCompare = hiddenSeries?.has("compare") ?? false;
  const allHidden =
    (data.length > 0 || (comparison?.data.length ?? 0) > 0) &&
    hidePrimary &&
    (hideCompare || !comparison);

  return (
    <ChartShell isEmpty={allHidden} emptyMessage={emptyMessage}>
      {(tooltipApi) => (
        <ParentSize className="size-full min-h-0 min-w-0">
          {({ width, height }) =>
            width > 0 && height > 0 ? (
              <LineInner
                width={width}
                height={height}
                data={data}
                comparison={comparison}
                xMode={xMode}
                formatY={formatY}
                formatXTick={formatX}
                resolved={resolved}
                stylePreset={style}
                clipPathId={`analytics-line-clip-${clipId}`}
                hidePrimary={hidePrimary}
                hideCompare={hideCompare}
                animate={animate}
                tooltipApi={tooltipApi}
              />
            ) : null
          }
        </ParentSize>
      )}
    </ChartShell>
  );
}

function LineInner({
  width,
  height,
  data,
  comparison,
  xMode,
  formatY,
  formatXTick,
  resolved,
  stylePreset,
  clipPathId,
  hidePrimary,
  hideCompare,
  animate,
  tooltipApi,
}: {
  width: number;
  height: number;
  data: NetFlowPoint[];
  comparison?: NetFlowComparison;
  xMode: "date" | "dayOfMonth";
  formatY: (minor: number) => string;
  formatXTick: (key: string) => string;
  resolved: "light" | "dark";
  stylePreset: StylePreset;
  clipPathId: string;
  hidePrimary: boolean;
  hideCompare: boolean;
  animate?: boolean;
  tooltipApi: {
    showTooltip: (p: ChartTooltipPayload) => void;
    moveTooltip: (p: ChartTooltipPayload) => void;
    hideTooltip: () => void;
  };
}) {
  const yAxisLabelGutter = 52;
  const yAxisTitleOffset = 22;
  const yAmountLabelsNudge = 44;
  const labelBand = 8 + yAxisLabelGutter;
  const yTickLabelX = -labelBand + yAmountLabelsNudge;
  const marginLeftBase = Math.max(116, 28 + yAxisLabelGutter + yAxisTitleOffset);
  const margin = {
    top: 16,
    right: 14,
    bottom: 56,
    left: marginLeftBase,
  };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const yTotalLabelX = -margin.left + 20;

  const xDomain = useMemo(() => {
    if (xMode === "dayOfMonth") return currentMonthDayDomain();
    const keys = new Set<string>();
    for (const p of data) keys.add(p.date);
    for (const p of comparison?.data ?? []) keys.add(p.date);
    return [...keys].sort();
  }, [data, comparison, xMode]);

  const xScale = scalePoint<string>({
    domain: xDomain,
    range: [0, innerW],
    padding: 0,
  });

  const dataByKey = useMemo(
    () => new Map(data.map((d) => [d.date, d.netMinor])),
    [data],
  );
  const compareByKey = useMemo(
    () => new Map((comparison?.data ?? []).map((d) => [d.date, d.netMinor])),
    [comparison],
  );

  const allNetValues = useMemo(() => {
    const vals: number[] = [];
    for (const key of xDomain) {
      if (!hidePrimary) {
        const v = dataByKey.get(key);
        if (v != null) vals.push(v);
      }
      if (!hideCompare) {
        const c = compareByKey.get(key);
        if (c != null) vals.push(c);
      }
    }
    return vals;
  }, [xDomain, dataByKey, compareByKey, hidePrimary, hideCompare]);

  const minY = Math.min(0, ...allNetValues);
  const maxY = Math.max(1, ...allNetValues);
  const yScale = scaleLinear<number>({
    domain: [minY, maxY],
    range: [innerH, 0],
    nice: true,
  });

  const primaryPoints = useMemo(
    () =>
      hidePrimary
        ? []
        : xDomain
            .filter((key) => dataByKey.has(key))
            .map((key) => ({
              key,
              x: xScale(key) ?? 0,
              y: yScale(dataByKey.get(key)!),
              net: dataByKey.get(key)!,
            })),
    [hidePrimary, xDomain, dataByKey, xScale, yScale],
  );

  const comparePoints = useMemo(
    () =>
      hideCompare
        ? []
        : xDomain
            .filter((key) => compareByKey.has(key))
            .map((key) => ({
              key,
              x: xScale(key) ?? 0,
              y: yScale(compareByKey.get(key)!),
              net: compareByKey.get(key)!,
            })),
    [hideCompare, xDomain, compareByKey, xScale, yScale],
  );

  const primaryColor = netLineColor(
    xDomain.filter((k) => dataByKey.has(k)).map((k) => dataByKey.get(k)!),
    resolved,
    stylePreset,
  );
  const compareColor = "var(--muted)";

  const yTicks = yScale.ticks(5);
  const xTicks = xTickIndices(xDomain.length, 6);

  const primaryPathRef = useRef<SVGPathElement | null>(null);
  const comparePathRef = useRef<SVGPathElement | null>(null);

  const reducedMotion = prefersReducedMotion();

  useLayoutEffect(() => {
    if (!animate || reducedMotion) return;
    const runDraw = (el: SVGPathElement | null, isDashed: boolean) => {
      if (!el) return;
      const len = el.getTotalLength();
      if (len <= 0) return;
      el.style.strokeDasharray = isDashed ? `${len}` : `${len}`;
      el.style.strokeDashoffset = `${len}`;
      requestAnimationFrame(() => {
        el.style.transition =
          "stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)";
        el.style.strokeDashoffset = "0";
      });
    };
    if (!hidePrimary) runDraw(primaryPathRef.current, false);
    if (!hideCompare) runDraw(comparePathRef.current, true);
  }, [
    animate,
    reducedMotion,
    hidePrimary,
    hideCompare,
    primaryPoints,
    comparePoints,
    width,
    height,
  ]);

  const tickLabel = (key: string) => (xMode === "dayOfMonth" ? key : formatXTick(key));

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="block max-w-full text-muted"
      role="img"
      aria-label="Cumulative net flow over time"
    >
      <Group left={margin.left} top={margin.top}>
        <defs>
          <clipPath id={clipPathId}>
            <rect x={0} y={0} width={innerW} height={innerH} />
          </clipPath>
        </defs>
        <Group clipPath={`url(#${clipPathId})`}>
          {yTicks.map((t, i) => (
            <line
              key={`grid-${i}`}
              x1={0}
              x2={innerW}
              y1={yScale(t)}
              y2={yScale(t)}
              stroke="var(--border)"
              strokeOpacity={0.4}
            />
          ))}
          {yScale(0) >= 0 && yScale(0) <= innerH ? (
            <line
              x1={0}
              x2={innerW}
              y1={yScale(0)}
              y2={yScale(0)}
              stroke="var(--border)"
              strokeOpacity={0.65}
              strokeDasharray="2 2"
            />
          ) : null}
          {comparison && comparePoints.length > 0 ? (
            <LinePath
              innerRef={comparePathRef}
              data={comparePoints}
              x={(p) => p.x}
              y={(p) => p.y}
              stroke={compareColor}
              strokeWidth={2}
              strokeDasharray="4 3"
              curve={curveMonotoneX}
              opacity={0.45}
            />
          ) : null}
          {primaryPoints.length > 0 ? (
            <LinePath
              innerRef={primaryPathRef}
              data={primaryPoints}
              x={(p) => p.x}
              y={(p) => p.y}
              stroke={primaryColor}
              strokeWidth={2}
              curve={curveMonotoneX}
              opacity={0.95}
            />
          ) : null}
          {comparePoints.map((p, i) => (
            <circle
              key={`cmp-${i}`}
              cx={p.x}
              cy={p.y}
              r={8}
              fill="transparent"
              className="cursor-default"
              onPointerEnter={(ev) =>
                tooltipApi.showTooltip(
                  pointerPayload(
                    ev,
                    comparison?.label
                      ? `${tickLabel(p.key)} · ${comparison.label}`
                      : tickLabel(p.key),
                    formatY(p.net),
                  ),
                )
              }
              onPointerMove={(ev) =>
                tooltipApi.moveTooltip(
                  pointerPayload(
                    ev,
                    comparison?.label
                      ? `${tickLabel(p.key)} · ${comparison.label}`
                      : tickLabel(p.key),
                    formatY(p.net),
                  ),
                )
              }
              onPointerLeave={() => tooltipApi.hideTooltip()}
            />
          ))}
          {primaryPoints.map((p, i) => (
            <g key={`net-${i}`} className={animate ? "fx-chart-enter" : undefined}>
              <circle
                cx={p.x}
                cy={p.y}
                r={8}
                fill="transparent"
                className="cursor-default"
                onPointerEnter={(ev) =>
                  tooltipApi.showTooltip(
                    pointerPayload(ev, tickLabel(p.key), formatY(p.net)),
                  )
                }
                onPointerMove={(ev) =>
                  tooltipApi.moveTooltip(
                    pointerPayload(ev, tickLabel(p.key), formatY(p.net)),
                  )
                }
                onPointerLeave={() => tooltipApi.hideTooltip()}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={2.25}
                fill={primaryColor}
                opacity={0.95}
                pointerEvents="none"
              />
            </g>
          ))}
        </Group>

        <line
          x1={0}
          y1={innerH}
          x2={innerW}
          y2={innerH}
          stroke="var(--border)"
          strokeWidth={1}
        />
        <line x1={0} y1={0} x2={0} y2={innerH} stroke="var(--border)" strokeWidth={1} />

        {yTicks.map((t, i) => (
          <g key={`yt-${i}`}>
            <line
              x1={-5}
              y1={yScale(t)}
              x2={0}
              y2={yScale(t)}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text
              x={yTickLabelX}
              y={yScale(t)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted text-[10px]"
            >
              {formatY(t)}
            </text>
          </g>
        ))}

        {xTicks.map((tickIdx) => {
          const key = xDomain[tickIdx];
          if (key == null) return null;
          const x = xScale(key);
          if (x == null) return null;
          return (
            <g key={`xt-${key}`}>
              <line
                x1={x}
                y1={innerH}
                x2={x}
                y2={innerH + 5}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text
                x={x}
                y={innerH + 14}
                textAnchor="middle"
                className="fill-muted text-[10px]"
              >
                {tickLabel(key)}
              </text>
            </g>
          );
        })}

        <text
          x={innerW / 2}
          y={innerH + 40}
          textAnchor="middle"
          className="fill-muted text-[10px]"
        >
          {xMode === "dayOfMonth" ? "Day of month" : "Date"}
        </text>
        <text
          transform={`translate(${yTotalLabelX}, ${innerH / 2}) rotate(-90)`}
          textAnchor="middle"
          className="fill-muted text-[10px]"
        >
          Net
        </text>
      </Group>
    </svg>
  );
}
