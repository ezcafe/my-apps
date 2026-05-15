"use client";

import { curveMonotoneX } from "@visx/curve";
import { Group } from "@visx/group";
import { LinePath } from "@visx/shape";
import { ParentSize } from "@visx/responsive";
import { scaleLinear, scalePoint } from "@visx/scale";
import { useId, useMemo } from "react";
import { chartExpenseHotPastel, colorByIndex } from "@/components/charts/chart-colors";
import type { StylePreset } from "@/components/theme-provider";
import { useTheme } from "@/components/theme-provider";
import { useFormatDate } from "@/lib/format-date";

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

/** Full current calendar month (1 … last day) for month-compare x-axis. */
function currentMonthDayDomain(): string[] {
  const now = new Date();
  const lastDay = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  return Array.from({ length: lastDay }, (_, i) => String(i + 1));
}

function netLineColor(
  netValues: number[],
  resolved: "light" | "dark",
  stylePreset: StylePreset,
): string {
  const last = netValues[netValues.length - 1] ?? 0;
  if (last < 0) return chartExpenseHotPastel(stylePreset, resolved);
  return colorByIndex(resolved, 3, stylePreset);
}

export function LineChart({
  data,
  comparison,
  xMode = "date",
  formatY,
}: {
  data: NetFlowPoint[];
  comparison?: NetFlowComparison;
  xMode?: "date" | "dayOfMonth";
  formatY: (minor: number) => string;
}) {
  const { resolved, style } = useTheme();
  const { formatChartDateTick } = useFormatDate();
  const clipId = useId().replace(/:/g, "");
  return (
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
            formatXTick={formatChartDateTick}
            resolved={resolved}
            stylePreset={style}
            clipPathId={`analytics-line-clip-${clipId}`}
          />
        ) : null
      }
    </ParentSize>
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
}: {
  width: number;
  height: number;
  data: NetFlowPoint[];
  comparison?: NetFlowComparison;
  xMode: "date" | "dayOfMonth";
  formatY: (minor: number) => string;
  formatXTick: (isoDate: string) => string;
  resolved: "light" | "dark";
  stylePreset: StylePreset;
  clipPathId: string;
}) {
  const yAxisLabelGutter = 52;
  const yAxisTitleOffset = 22;
  const yAmountLabelsNudge = 44;
  const labelBand = 8 + yAxisLabelGutter;
  const yTickLabelX = -labelBand + yAmountLabelsNudge;
  const marginLeftBase = Math.max(116, 28 + yAxisLabelGutter + yAxisTitleOffset);
  const margin = {
    top: 28,
    right: 14,
    bottom: 56,
    left: marginLeftBase,
  };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const yTotalLabelX = -margin.left + 20;

  const xDomain = useMemo(() => {
    if (xMode === "dayOfMonth") {
      return currentMonthDayDomain();
    }
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
      const v = dataByKey.get(key);
      if (v != null) vals.push(v);
      const c = compareByKey.get(key);
      if (c != null) vals.push(c);
    }
    return vals;
  }, [xDomain, dataByKey, compareByKey]);

  const minY = Math.min(0, ...allNetValues);
  const maxY = Math.max(1, ...allNetValues);
  const yScale = scaleLinear<number>({
    domain: [minY, maxY],
    range: [innerH, 0],
    nice: true,
  });

  const primaryPoints = xDomain
    .filter((key) => dataByKey.has(key))
    .map((key) => ({
      x: xScale(key) ?? 0,
      y: yScale(dataByKey.get(key)!),
    }));

  const comparePoints = xDomain
    .filter((key) => compareByKey.has(key))
    .map((key) => ({
      x: xScale(key) ?? 0,
      y: yScale(compareByKey.get(key)!),
    }));

  const primaryColor = netLineColor(
    xDomain.filter((k) => dataByKey.has(k)).map((k) => dataByKey.get(k)!),
    resolved,
    stylePreset,
  );
  const compareColor = "var(--muted)";

  const yTicks = yScale.ticks(5);
  const xTicks = xTickIndices(xDomain.length, 6);

  const legendCompareWidth = comparison
    ? Math.min(200, 8 + comparison.label.length * 6.5)
    : 0;
  const legendPrimaryX = innerW - (comparison ? legendCompareWidth + 88 : 72);

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
        <g fontSize={11} transform="translate(0, -14)">
          <line
            x1={legendPrimaryX}
            y1={3}
            x2={legendPrimaryX + 16}
            y2={3}
            stroke={primaryColor}
            strokeWidth={2}
          />
          <text x={legendPrimaryX + 22} y={7} fill="currentColor">
            This month
          </text>
          {comparison ? (
            <>
              <line
                x1={innerW - legendCompareWidth}
                y1={3}
                x2={innerW - legendCompareWidth + 16}
                y2={3}
                stroke={compareColor}
                strokeWidth={2}
                strokeDasharray="4 3"
                opacity={0.45}
              />
              <text
                x={innerW - legendCompareWidth + 22}
                y={7}
                fill="currentColor"
                opacity={0.75}
              >
                {comparison.label}
              </text>
            </>
          ) : null}
        </g>
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
              data={primaryPoints}
              x={(p) => p.x}
              y={(p) => p.y}
              stroke={primaryColor}
              strokeWidth={2}
              curve={curveMonotoneX}
              opacity={0.95}
            />
          ) : null}
          {primaryPoints.map((p, i) => (
            <circle
              key={`net-${i}`}
              cx={p.x}
              cy={p.y}
              r={2.25}
              fill={primaryColor}
              opacity={0.95}
            />
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
          const tickLabel =
            xMode === "dayOfMonth" ? key : formatXTick(key);
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
                {tickLabel}
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
