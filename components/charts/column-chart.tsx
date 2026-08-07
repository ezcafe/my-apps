"use client";

import { curveMonotoneX } from "@visx/curve";
import { Group } from "@visx/group";
import { LinePath } from "@visx/shape";
import { ParentSize } from "@visx/responsive";
import { scaleBand, scaleLinear } from "@visx/scale";
import {
  chartExpenseColor,
  chartIncomeColor,
} from "@/components/charts/chart-income-expense-colors";
import { ChartShell } from "@/components/charts/chart-shell";
import type { ChartTooltipPayload } from "@/components/charts/use-chart-tooltip";
import type { StylePreset } from "@/components/theme-provider";
import { useTheme } from "@/components/theme-provider";
import { useFormatDate } from "@/lib/format-date";
type Row = { month: string; expenseMinor: number; incomeMinor: number };

const BAR_CORNER_PX = 4;

function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  corners: { tl: boolean; tr: boolean; br: boolean; bl: boolean },
): string {
  if (w <= 0 || h <= 0) return "";
  const rr = Math.min(Math.max(0, r), w / 2, h / 2);
  const tlR = corners.tl ? rr : 0;
  const trR = corners.tr ? rr : 0;
  const brR = corners.br ? rr : 0;
  const blR = corners.bl ? rr : 0;

  const parts: string[] = [`M ${x + tlR} ${y}`];

  if (trR > 0) {
    parts.push(`H ${x + w - trR}`, `A ${trR} ${trR} 0 0 1 ${x + w} ${y + trR}`);
  } else {
    parts.push(`H ${x + w}`);
  }

  if (brR > 0) {
    parts.push(`V ${y + h - brR}`, `A ${brR} ${brR} 0 0 1 ${x + w - brR} ${y + h}`);
  } else {
    parts.push(`V ${y + h}`);
  }

  if (blR > 0) {
    parts.push(`H ${x + blR}`, `A ${blR} ${blR} 0 0 1 ${x} ${y + h - blR}`);
  } else {
    parts.push(`H ${x}`);
  }

  if (tlR > 0) {
    parts.push(`V ${y + tlR}`, `A ${tlR} ${tlR} 0 0 1 ${x + tlR} ${y}`);
  } else {
    parts.push(`V ${y}`);
  }

  parts.push("Z");
  return parts.join(" ");
}

function pointerPayload(
  e: React.PointerEvent,
  label: string,
  valueText: string,
): ChartTooltipPayload {
  return { label, valueText, clientX: e.clientX, clientY: e.clientY };
}

export type ColumnChartItemClickPayload = {
  month: string;
  series: "income" | "expense";
};

export function ColumnChart({
  data,
  hiddenSeries,
  animate = true,
  formatValue,
  formatMonthLabel: formatMonthLabelProp,
  showNetLine = false,
  onItemClick,
}: {
  data: Row[];
  hiddenSeries?: Set<"expense" | "income">;
  animate?: boolean;
  formatValue: (minor: number) => string;
  formatMonthLabel?: (yyyyMm: string) => string;
  showNetLine?: boolean;
  onItemClick?: (item: ColumnChartItemClickPayload) => void;
}) {
  const { resolved, style } = useTheme();
  const { formatMonthYear } = useFormatDate();
  const formatMonthLabel = formatMonthLabelProp ?? formatMonthYear;
  const hideExpense = hiddenSeries?.has("expense") ?? false;
  const hideIncome = hiddenSeries?.has("income") ?? false;
  const allHidden =
    data.some((d) => d.expenseMinor > 0 || d.incomeMinor > 0) &&
    hideExpense &&
    hideIncome;

  return (
    <ChartShell
      isEmpty={allHidden}
      emptyMessage="All series hidden — click legend to show"
    >
      {(tooltipApi) => (
        <ParentSize className="size-full min-h-0 min-w-0">
          {({ width, height }) =>
            width > 0 && height > 0 ? (
              <ColumnInner
                width={width}
                height={height}
                data={data}
                formatMonthLabel={formatMonthLabel}
                resolved={resolved}
                stylePreset={style}
                hideExpense={hideExpense}
                hideIncome={hideIncome}
                animate={animate}
                formatValue={formatValue}
                showNetLine={showNetLine}
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

function ColumnInner({
  width,
  height,
  data,
  formatMonthLabel,
  resolved,
  stylePreset,
  hideExpense,
  hideIncome,
  animate,
  formatValue,
  showNetLine,
  tooltipApi,
  onItemClick,
}: {
  width: number;
  height: number;
  data: Row[];
  formatMonthLabel: (yyyyMm: string) => string;
  resolved: "light" | "dark";
  stylePreset: StylePreset;
  hideExpense: boolean;
  hideIncome: boolean;
  animate?: boolean;
  formatValue: (minor: number) => string;
  showNetLine: boolean;
  tooltipApi: {
    showTooltip: (p: ChartTooltipPayload) => void;
    moveTooltip: (p: ChartTooltipPayload) => void;
    hideTooltip: () => void;
  };
  onItemClick?: (item: ColumnChartItemClickPayload) => void;
}) {
  const margin = { top: 12, right: 8, bottom: 36, left: 44 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const xScale = scaleBand<string>({
    domain: data.map((d) => d.month),
    range: [0, innerW],
    padding: 0.25,
  });

  const totals = data.map((d) => {
    const e = hideExpense ? 0 : d.expenseMinor;
    const inc = hideIncome ? 0 : d.incomeMinor;
    return e + inc;
  });
  const netValues = data.map((d) => d.incomeMinor - d.expenseMinor);
  const minY = showNetLine ? Math.min(0, ...netValues) : 0;
  const maxY = Math.max(1, ...totals, ...(showNetLine ? netValues : []));
  const yScale = scaleLinear<number>({
    domain: [minY, maxY],
    range: [innerH, 0],
    nice: showNetLine,
  });

  const netPoints = data
    .map((d) => {
      const x = xScale(d.month);
      if (x == null) return null;
      const net = d.incomeMinor - d.expenseMinor;
      return {
        month: d.month,
        x: x + xScale.bandwidth() / 2,
        y: yScale(net),
        net,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p != null);

  const expenseColor = chartExpenseColor(resolved, stylePreset);
  const incomeColor = chartIncomeColor(resolved, stylePreset);

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="block max-w-full"
      role="img"
      aria-label="Monthly expense and income stacked per month"
    >
      <Group left={margin.left} top={margin.top}>
        {data.map((d, monthIdx) => {
          const x = xScale(d.month);
          if (x == null) return null;
          const barW = xScale.bandwidth();
          const e = hideExpense ? 0 : d.expenseMinor;
          const inc = hideIncome ? 0 : d.incomeMinor;
          const yExpense = yScale(e);
          const yTotal = yScale(e + inc);
          const hExpense = innerH - yExpense;
          const hIncome = yExpense - yTotal;
          const expenseCorners =
            inc > 0
              ? { tl: false, tr: false, br: true, bl: true }
              : { tl: true, tr: true, br: true, bl: true };
          const incomeCorners =
            e > 0
              ? { tl: true, tr: true, br: false, bl: false }
              : { tl: true, tr: true, br: true, bl: true };
          const monthLabel = formatMonthLabel(d.month);
          const stagger = animate ? { animationDelay: `${monthIdx * 40}ms` } : undefined;

          return (
            <Group key={d.month}>
              {e > 0 ? (
                <g className={animate ? "fx-chart-bar-grow" : undefined} style={stagger}>
                  <path
                    d={roundedRectPath(x, yExpense, barW, hExpense, BAR_CORNER_PX, expenseCorners)}
                    fill={expenseColor}
                    className="transition-opacity duration-150"
                    opacity={0.9}
                    pointerEvents="none"
                  />
                  <rect
                    x={x}
                    y={yExpense}
                    width={barW}
                    height={hExpense}
                    fill="transparent"
                    className={onItemClick ? "cursor-pointer" : "cursor-default"}
                    onPointerEnter={(ev) =>
                      tooltipApi.showTooltip(
                        pointerPayload(
                          ev,
                          `${monthLabel} · Expense`,
                          formatValue(d.expenseMinor),
                        ),
                      )
                    }
                    onPointerMove={(ev) =>
                      tooltipApi.moveTooltip(
                        pointerPayload(
                          ev,
                          `${monthLabel} · Expense`,
                          formatValue(d.expenseMinor),
                        ),
                      )
                    }
                    onPointerLeave={() => tooltipApi.hideTooltip()}
                    onClick={() => {
                      if (!onItemClick) return;
                      onItemClick({ month: d.month, series: "expense" });
                    }}
                  />
                </g>
              ) : null}
              {inc > 0 ? (
                <g className={animate ? "fx-chart-bar-grow" : undefined} style={stagger}>
                  <path
                    d={roundedRectPath(x, yTotal, barW, hIncome, BAR_CORNER_PX, incomeCorners)}
                    fill={incomeColor}
                    className="transition-opacity duration-150"
                    opacity={0.9}
                    pointerEvents="none"
                  />
                  <rect
                    x={x}
                    y={yTotal}
                    width={barW}
                    height={hIncome}
                    fill="transparent"
                    className={onItemClick ? "cursor-pointer" : "cursor-default"}
                    onPointerEnter={(ev) =>
                      tooltipApi.showTooltip(
                        pointerPayload(
                          ev,
                          `${monthLabel} · Income`,
                          formatValue(d.incomeMinor),
                        ),
                      )
                    }
                    onPointerMove={(ev) =>
                      tooltipApi.moveTooltip(
                        pointerPayload(
                          ev,
                          `${monthLabel} · Income`,
                          formatValue(d.incomeMinor),
                        ),
                      )
                    }
                    onPointerLeave={() => tooltipApi.hideTooltip()}
                    onClick={() => {
                      if (!onItemClick) return;
                      onItemClick({ month: d.month, series: "income" });
                    }}
                  />
                </g>
              ) : null}
            </Group>
          );
        })}
        {showNetLine && netPoints.length > 0 ? (
          <LinePath
            data={netPoints}
            x={(p) => p.x}
            y={(p) => p.y}
            curve={curveMonotoneX}
            stroke="var(--foreground)"
            strokeWidth={2}
            strokeOpacity={0.55}
            pointerEvents="none"
          />
        ) : null}
        {showNetLine
          ? netPoints.map((p) => (
              <circle
                key={`net-${p.month}`}
                cx={p.x}
                cy={p.y}
                r={3}
                fill="var(--foreground)"
                fillOpacity={0.7}
                pointerEvents="none"
              />
            ))
          : null}
        {data.map((d) => {
          const x = xScale(d.month);
          if (x == null) return null;
          return (
            <text
              key={`lbl-${d.month}`}
              x={x + xScale.bandwidth() / 2}
              y={innerH + 14}
              textAnchor="middle"
              className="fill-muted text-[10px]"
            >
              {formatMonthLabel(d.month)}
            </text>
          );
        })}
      </Group>
    </svg>
  );
}
