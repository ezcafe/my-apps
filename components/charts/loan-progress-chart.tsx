"use client";

import { curveMonotoneX } from "@visx/curve";
import { Group } from "@visx/group";
import { LinePath } from "@visx/shape";
import { ParentSize } from "@visx/responsive";
import { scaleLinear, scalePoint } from "@visx/scale";
import { useId, useLayoutEffect, useMemo, useRef } from "react";
import {
  loanProgressSeriesColors,
  type LoanProgressSeriesKey,
} from "@/components/charts/loan-progress-colors";
import { ChartShell } from "@/components/charts/chart-shell";
import type { ChartTooltipPayload } from "@/components/charts/use-chart-tooltip";
import { useTheme } from "@/components/theme-provider";
import { prefersReducedMotion } from "@/lib/microinteractions";

export type LoanProgressChartPoint = {
  label: string;
  scheduledCumulativeMinor: number;
  actualCumulativeMinor: number;
  projectedCumulativeMinor: number;
};

export type { LoanProgressSeriesKey } from "@/components/charts/loan-progress-colors";
export { loanProgressSeriesColors } from "@/components/charts/loan-progress-colors";

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

function pointerPayload(
  e: React.PointerEvent,
  label: string,
  valueText: string,
): ChartTooltipPayload {
  return { label, valueText, clientX: e.clientX, clientY: e.clientY };
}

const SERIES_META: {
  key: LoanProgressSeriesKey;
  label: string;
  strokeDasharray?: string;
  opacity: number;
  accessor: (d: LoanProgressChartPoint) => number;
  drawOrder: number;
}[] = [
  {
    key: "scheduled",
    label: "Scheduled",
    strokeDasharray: "4 3",
    opacity: 0.45,
    accessor: (d) => d.scheduledCumulativeMinor,
    drawOrder: 0,
  },
  {
    key: "projected",
    label: "Projected",
    strokeDasharray: "2 4",
    opacity: 0.65,
    accessor: (d) => d.projectedCumulativeMinor,
    drawOrder: 1,
  },
  {
    key: "actual",
    label: "Paid",
    opacity: 0.95,
    accessor: (d) => d.actualCumulativeMinor,
    drawOrder: 2,
  },
];

export function LoanProgressChart({
  data,
  formatY,
  hiddenSeries,
  animate = true,
}: {
  data: LoanProgressChartPoint[];
  formatY: (minor: number) => string;
  hiddenSeries?: Set<LoanProgressSeriesKey>;
  animate?: boolean;
}) {
  const { resolved, style } = useTheme();
  const clipId = useId().replace(/:/g, "");
  const colors = loanProgressSeriesColors(resolved, style);

  const visibleSeries = SERIES_META.filter((s) => !hiddenSeries?.has(s.key));
  const allHidden = data.length > 0 && visibleSeries.length === 0;

  if (data.length === 0) {
    return (
      <p className="flex h-full items-center justify-center text-center text-sm text-muted">
        No schedule data yet.
      </p>
    );
  }

  return (
    <ChartShell
      isEmpty={allHidden}
      emptyMessage="All series hidden — click legend to show"
    >
      {(tooltipApi) => (
        <ParentSize className="size-full min-h-0 min-w-0">
          {({ width, height }) =>
            width > 0 && height > 0 ? (
              <LoanProgressInner
                width={width}
                height={height}
                data={data}
                formatY={formatY}
                colors={colors}
                hiddenSeries={hiddenSeries}
                clipPathId={`loan-progress-clip-${clipId}`}
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

function estimateTickLabelWidth(text: string): number {
  return text.length * 5.75;
}

function LoanProgressInner({
  width,
  height,
  data,
  formatY,
  colors,
  hiddenSeries,
  clipPathId,
  animate,
  tooltipApi,
}: {
  width: number;
  height: number;
  data: LoanProgressChartPoint[];
  formatY: (minor: number) => string;
  colors: Record<LoanProgressSeriesKey, string>;
  hiddenSeries?: Set<LoanProgressSeriesKey>;
  clipPathId: string;
  animate?: boolean;
  tooltipApi: {
    showTooltip: (p: ChartTooltipPayload) => void;
    moveTooltip: (p: ChartTooltipPayload) => void;
    hideTooltip: () => void;
  };
}) {
  const xDomain = useMemo(() => data.map((d) => d.label), [data]);
  const visibleMeta = SERIES_META.filter((s) => !hiddenSeries?.has(s.key));

  const allValues = useMemo(
    () =>
      visibleMeta.flatMap((s) => data.map((d) => s.accessor(d))),
    [data, visibleMeta],
  );

  const maxY = Math.max(1, ...allValues);

  const {
    margin,
    innerW,
    innerH,
    yScale,
    yTicks,
    xScale,
    yTickLabelX,
    yTotalLabelX,
  } = useMemo(() => {
    const yAxisLabelGutter = 68;
    const yAxisTitleOffset = 28;
    const yAmountLabelsNudge = 52;
    const labelBand = 8 + yAxisLabelGutter;
    const marginTop = 16;
    const marginRight = 14;
    const marginBottom = 56;
    const provisionalInnerH = height - marginTop - marginBottom;

    const scale = scaleLinear<number>({
      domain: [0, maxY],
      range: [provisionalInnerH, 0],
      nice: true,
    });
    const ticks = scale.ticks(5);
    const maxTickLabelWidth = Math.max(
      0,
      ...ticks.map((t) => estimateTickLabelWidth(formatY(t))),
    );
    const marginLeft = Math.ceil(
      Math.max(148, maxTickLabelWidth + yAxisLabelGutter + yAxisTitleOffset),
    );
    const plotW = Math.max(0, width - marginLeft - marginRight);

    return {
      margin: {
        top: marginTop,
        right: marginRight,
        bottom: marginBottom,
        left: marginLeft,
      },
      innerW: plotW,
      innerH: provisionalInnerH,
      yScale: scale,
      yTicks: ticks,
      xScale: scalePoint<string>({
        domain: xDomain,
        range: [0, plotW],
        padding: 0,
      }),
      yTickLabelX: -labelBand + yAmountLabelsNudge,
      yTotalLabelX: -marginLeft + 24,
    };
  }, [width, height, maxY, xDomain, formatY]);

  const seriesPoints = useMemo(
    () =>
      visibleMeta.map((meta) => ({
        ...meta,
        points: data.map((row) => ({
          key: row.label,
          x: xScale(row.label) ?? 0,
          y: yScale(meta.accessor(row)),
          value: meta.accessor(row),
        })),
      })),
    [data, visibleMeta, xScale, yScale],
  );

  const pathRefs = useRef<Map<LoanProgressSeriesKey, SVGPathElement | null>>(
    new Map(),
  );
  const reducedMotion = prefersReducedMotion();

  useLayoutEffect(() => {
    if (!animate || reducedMotion) return;
    for (const meta of visibleMeta) {
      const el = pathRefs.current.get(meta.key);
      if (!el) continue;
      const len = el.getTotalLength();
      if (len <= 0) continue;
      const isDashed = meta.strokeDasharray != null;
      el.style.strokeDasharray = isDashed ? `${len}` : `${len}`;
      el.style.strokeDashoffset = `${len}`;
      requestAnimationFrame(() => {
        el.style.transition =
          "stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)";
        el.style.strokeDashoffset = "0";
      });
    }
  }, [animate, reducedMotion, visibleMeta, seriesPoints, width, height]);

  const xTicks = xTickIndices(xDomain.length, 6);
  const primaryKey: LoanProgressSeriesKey = "actual";
  const primaryVisible = !hiddenSeries?.has(primaryKey);

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="block max-w-full text-muted"
      role="img"
      aria-label="Loan payoff progress over installments"
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
          {seriesPoints.map((series) => (
            <LinePath
              key={series.key}
              innerRef={(el) => {
                pathRefs.current.set(series.key, el);
              }}
              data={series.points}
              x={(p) => p.x}
              y={(p) => p.y}
              stroke={colors[series.key]}
              strokeWidth={2}
              strokeDasharray={series.strokeDasharray}
              curve={curveMonotoneX}
              opacity={series.opacity}
            />
          ))}
          {seriesPoints.flatMap((series) =>
            series.points.map((p, i) => (
              <circle
                key={`${series.key}-${i}`}
                cx={p.x}
                cy={p.y}
                r={8}
                fill="transparent"
                className="cursor-default"
                onPointerEnter={(ev) =>
                  tooltipApi.showTooltip(
                    pointerPayload(
                      ev,
                      `#${p.key} · ${series.label}`,
                      formatY(p.value),
                    ),
                  )
                }
                onPointerMove={(ev) =>
                  tooltipApi.moveTooltip(
                    pointerPayload(
                      ev,
                      `#${p.key} · ${series.label}`,
                      formatY(p.value),
                    ),
                  )
                }
                onPointerLeave={() => tooltipApi.hideTooltip()}
              />
            )),
          )}
          {primaryVisible
            ? seriesPoints
                .find((s) => s.key === primaryKey)
                ?.points.map((p, i) => (
                  <circle
                    key={`dot-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={2.25}
                    fill={colors[primaryKey]}
                    opacity={0.95}
                    pointerEvents="none"
                  />
                ))
            : null}
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
                {key}
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
          Installment
        </text>
        <text
          transform={`translate(${yTotalLabelX}, ${innerH / 2}) rotate(-90)`}
          textAnchor="middle"
          className="fill-muted text-[10px]"
        >
          Principal paid
        </text>
      </Group>
    </svg>
  );
}
