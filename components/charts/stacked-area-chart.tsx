"use client";

import { curveMonotoneX } from "@visx/curve";
import { Group } from "@visx/group";
import { ChartParentSize } from "@/components/charts/chart-parent-size";
import { scaleLinear, scalePoint } from "@visx/scale";
import { AreaStack } from "@visx/shape";
import { useMemo } from "react";
import { colorByIndex } from "@/components/charts/chart-colors";
import { ChartShell } from "@/components/charts/chart-shell";
import type { ChartTooltipPayload } from "@/components/charts/use-chart-tooltip";
import type { StylePreset } from "@/components/theme-provider";
import { useTheme } from "@/components/theme-provider";
import { useFormatDate } from "@/lib/format-date";
import type { StackedMonthSeries } from "@/lib/analytics-category-rollup";

type StackDatum = {
  month: string;
  [seriesKey: string]: number | string;
};

function pointerPayload(
  e: React.PointerEvent,
  label: string,
  valueText: string,
): ChartTooltipPayload {
  return { label, valueText, clientX: e.clientX, clientY: e.clientY };
}

export type StackedAreaItemClickPayload = {
  month: string;
  key: string;
  label: string;
};

export function StackedAreaChart({
  data,
  hiddenKeys,
  formatValue,
  formatMonthLabel: formatMonthLabelProp,
  animate = true,
  onItemClick,
}: {
  data: StackedMonthSeries[];
  hiddenKeys?: Set<string>;
  formatValue: (minor: number) => string;
  formatMonthLabel?: (yyyyMm: string) => string;
  animate?: boolean;
  onItemClick?: (item: StackedAreaItemClickPayload) => void;
}) {
  const { formatMonthYear } = useFormatDate();
  const formatMonthLabel = formatMonthLabelProp ?? formatMonthYear;
  const hasData = data.some((m) => m.series.some((s) => s.valueMinor > 0));

  return (
    <ChartShell
      isEmpty={!hasData}
      emptyMessage="No category spend across months in this range"
    >
      {(tooltipApi) => (
        <ChartParentSize>
          {({ width, height }) => (
            <StackedAreaInner
              width={width}
              height={height}
              data={data}
              hiddenKeys={hiddenKeys}
              formatMonthLabel={formatMonthLabel}
              animate={animate}
              formatValue={formatValue}
              tooltipApi={tooltipApi}
              onItemClick={onItemClick}
            />
          )}
        </ChartParentSize>
      )}
    </ChartShell>
  );
}

function StackedAreaInner({
  width,
  height,
  data,
  hiddenKeys,
  formatMonthLabel,
  animate,
  formatValue,
  tooltipApi,
  onItemClick,
}: {
  width: number;
  height: number;
  data: StackedMonthSeries[];
  hiddenKeys?: Set<string>;
  formatMonthLabel: (yyyyMm: string) => string;
  animate?: boolean;
  formatValue: (minor: number) => string;
  tooltipApi: {
    showTooltip: (p: ChartTooltipPayload) => void;
    moveTooltip: (p: ChartTooltipPayload) => void;
    hideTooltip: () => void;
  };
  onItemClick?: (item: StackedAreaItemClickPayload) => void;
}) {
  const { resolved, style } = useTheme();
  const stylePreset = style as StylePreset;
  const margin = { top: 12, right: 8, bottom: 36, left: 44 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const keys = useMemo(() => {
    const set = new Set<string>();
    for (const m of data) {
      for (const s of m.series) {
        if (!hiddenKeys?.has(s.key) && s.valueMinor > 0) set.add(s.key);
      }
    }
    return [...set];
  }, [data, hiddenKeys]);

  const labelByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of data) {
      for (const s of m.series) map.set(s.key, s.label);
    }
    return map;
  }, [data]);

  const stackData: StackDatum[] = useMemo(
    () =>
      data.map((m) => {
        const row: StackDatum = { month: m.month };
        for (const s of m.series) {
          if (hiddenKeys?.has(s.key)) continue;
          row[s.key] = s.valueMinor;
        }
        return row;
      }),
    [data, hiddenKeys],
  );

  const xDomain = data.map((d) => d.month);
  const xScale = scalePoint<string>({
    domain: xDomain,
    range: [0, innerW],
    padding: 0,
  });

  const totals = stackData.map((row) =>
    keys.reduce((s, k) => s + (Number(row[k]) || 0), 0),
  );
  const maxY = Math.max(1, ...totals);
  const yScale = scaleLinear<number>({
    domain: [0, maxY],
    range: [innerH, 0],
  });

  const colorByKey = useMemo(() => {
    const map = new Map<string, string>();
    keys.forEach((k, i) => {
      map.set(k, colorByIndex(resolved, i, stylePreset));
    });
    return map;
  }, [keys, resolved, stylePreset]);

  const singleMonth = stackData.length === 1;
  const singleRow = singleMonth ? stackData[0] : null;
  const hitHalfWidth = Math.min(18, Math.max(10, innerW / Math.max(xDomain.length, 1) / 2));

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="block max-w-full"
      role="img"
      aria-label="Category spending trend by month"
    >
      <Group left={margin.left} top={margin.top}>
        {singleMonth && singleRow ? (
          <StackedSingleMonthColumn
            row={singleRow}
            keys={keys}
            innerW={innerW}
            innerH={innerH}
            yScale={yScale}
            colorByKey={colorByKey}
            labelByKey={labelByKey}
            formatMonthLabel={formatMonthLabel}
            formatValue={formatValue}
            animate={animate}
            tooltipApi={tooltipApi}
            onItemClick={onItemClick}
          />
        ) : (
          <>
            <AreaStack
              data={stackData}
              keys={keys}
              x={(d) => xScale(d.data.month) ?? 0}
              y0={(d) => yScale(d[0]) ?? innerH}
              y1={(d) => yScale(d[1]) ?? innerH}
              curve={curveMonotoneX}
            >
              {({ stacks, path }) =>
                stacks.map((stack, i) => (
                  <path
                    key={stack.key}
                    d={path(stack) ?? ""}
                    fill={colorByKey.get(stack.key) ?? "var(--accent)"}
                    className={animate ? "fx-chart-arc-pop" : undefined}
                    style={animate ? { animationDelay: `${i * 40}ms` } : undefined}
                    opacity={0.85}
                    pointerEvents="none"
                  />
                ))
              }
            </AreaStack>
            {stackData.map((row) => {
              const x = xScale(row.month);
              if (x == null) return null;
              const month = String(row.month);
              const monthLabel = formatMonthLabel(month);
              let cumSum = 0;
              return (
                <g key={`hit-${month}`}>
                  {keys.map((key) => {
                    const value = Number(row[key]) || 0;
                    if (value <= 0) return null;
                    const yTop = yScale(cumSum + value) ?? 0;
                    const yBottom = yScale(cumSum) ?? innerH;
                    cumSum += value;
                    const categoryLabel = labelByKey.get(key) ?? key;
                    const tipLabel = `${monthLabel} · ${categoryLabel}`;
                    return (
                      <rect
                        key={`${month}-${key}`}
                        x={x - hitHalfWidth}
                        y={yTop}
                        width={hitHalfWidth * 2}
                        height={Math.max(yBottom - yTop, 4)}
                        fill="transparent"
                        className={onItemClick ? "cursor-pointer" : "cursor-default"}
                        onPointerEnter={(ev) =>
                          tooltipApi.showTooltip(
                            pointerPayload(ev, tipLabel, formatValue(value)),
                          )
                        }
                        onPointerMove={(ev) =>
                          tooltipApi.moveTooltip(
                            pointerPayload(ev, tipLabel, formatValue(value)),
                          )
                        }
                        onPointerLeave={() => tooltipApi.hideTooltip()}
                        onClick={() => {
                          if (!onItemClick) return;
                          onItemClick({
                            month,
                            key,
                            label: categoryLabel,
                          });
                        }}
                      />
                    );
                  })}
                </g>
              );
            })}
            {xDomain.map((month) => {
              const x = xScale(month);
              if (x == null) return null;
              return (
                <text
                  key={`lbl-${month}`}
                  x={x}
                  y={innerH + 14}
                  textAnchor="middle"
                  className="fill-muted text-[10px]"
                >
                  {formatMonthLabel(month)}
                </text>
              );
            })}
          </>
        )}
      </Group>
    </svg>
  );
}

function StackedSingleMonthColumn({
  row,
  keys,
  innerW,
  innerH,
  yScale,
  colorByKey,
  labelByKey,
  formatMonthLabel,
  formatValue,
  animate,
  tooltipApi,
  onItemClick,
}: {
  row: StackDatum;
  keys: string[];
  innerW: number;
  innerH: number;
  yScale: ReturnType<typeof scaleLinear<number>>;
  colorByKey: Map<string, string>;
  labelByKey: Map<string, string>;
  formatMonthLabel: (yyyyMm: string) => string;
  formatValue: (minor: number) => string;
  animate?: boolean;
  tooltipApi: {
    showTooltip: (p: ChartTooltipPayload) => void;
    moveTooltip: (p: ChartTooltipPayload) => void;
    hideTooltip: () => void;
  };
  onItemClick?: (item: StackedAreaItemClickPayload) => void;
}) {
  const month = String(row.month);
  const monthLabel = formatMonthLabel(month);
  const barWidth = Math.min(96, innerW * 0.4);
  const barX = (innerW - barWidth) / 2;
  const labelX = barX + barWidth / 2;

  let cumSum = 0;
  const segments: { key: string; value: number; y: number; h: number }[] = [];
  for (const key of keys) {
    const value = Number(row[key]) || 0;
    if (value <= 0) continue;
    const yTop = yScale(cumSum + value) ?? 0;
    const yBottom = yScale(cumSum) ?? innerH;
    segments.push({ key, value, y: yTop, h: yBottom - yTop });
    cumSum += value;
  }

  return (
    <>
      {segments.map((seg, i) => {
        const categoryLabel = labelByKey.get(seg.key) ?? seg.key;
        const tipLabel = `${monthLabel} · ${categoryLabel}`;
        return (
          <g key={seg.key}>
            <rect
              x={barX}
              y={seg.y}
              width={barWidth}
              height={seg.h}
              fill={colorByKey.get(seg.key) ?? "var(--accent)"}
              opacity={0.85}
              className={animate ? "fx-chart-bar-grow" : undefined}
              style={animate ? { animationDelay: `${i * 40}ms` } : undefined}
              pointerEvents="none"
            />
            <rect
              x={barX}
              y={seg.y}
              width={barWidth}
              height={seg.h}
              fill="transparent"
              className={onItemClick ? "cursor-pointer" : "cursor-default"}
              onPointerEnter={(ev) =>
                tooltipApi.showTooltip(
                  pointerPayload(ev, tipLabel, formatValue(seg.value)),
                )
              }
              onPointerMove={(ev) =>
                tooltipApi.moveTooltip(
                  pointerPayload(ev, tipLabel, formatValue(seg.value)),
                )
              }
              onPointerLeave={() => tooltipApi.hideTooltip()}
              onClick={() => {
                if (!onItemClick) return;
                onItemClick({
                  month,
                  key: seg.key,
                  label: categoryLabel,
                });
              }}
            />
          </g>
        );
      })}
      <text
        x={labelX}
        y={innerH + 14}
        textAnchor="middle"
        className="fill-muted text-[10px]"
      >
        {monthLabel}
      </text>
    </>
  );
}
