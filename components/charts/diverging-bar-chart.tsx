"use client";

import { Group } from "@visx/group";
import { ChartParentSize } from "@/components/charts/chart-parent-size";
import { scaleLinear } from "@visx/scale";
import {
  chartExpenseColor,
  chartIncomeColor,
} from "@/components/charts/chart-income-expense-colors";
import { ChartShell } from "@/components/charts/chart-shell";
import type { ChartTooltipPayload } from "@/components/charts/use-chart-tooltip";
import type { StylePreset } from "@/components/theme-provider";
import { useTheme } from "@/components/theme-provider";

function pointerPayload(
  e: React.PointerEvent,
  label: string,
  valueText: string,
): ChartTooltipPayload {
  return { label, valueText, clientX: e.clientX, clientY: e.clientY };
}

export type DivergingBarItemClickPayload = {
  kind: "income" | "expense";
};

export function DivergingBarChart({
  incomeMinor,
  expenseMinor,
  formatValue,
  animate = true,
  onItemClick,
}: {
  incomeMinor: number;
  expenseMinor: number;
  formatValue: (minor: number) => string;
  animate?: boolean;
  onItemClick?: (item: DivergingBarItemClickPayload) => void;
}) {
  const isEmpty = incomeMinor <= 0 && expenseMinor <= 0;

  return (
    <ChartShell isEmpty={isEmpty} emptyMessage="No income or expenses in this range">
      {(tooltipApi) => (
        <ChartParentSize>
          {({ width, height }) => (
            <DivergingInner
              width={width}
              height={height}
              incomeMinor={incomeMinor}
              expenseMinor={expenseMinor}
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

function DivergingInner({
  width,
  height,
  incomeMinor,
  expenseMinor,
  animate,
  formatValue,
  tooltipApi,
  onItemClick,
}: {
  width: number;
  height: number;
  incomeMinor: number;
  expenseMinor: number;
  animate?: boolean;
  formatValue: (minor: number) => string;
  tooltipApi: {
    showTooltip: (p: ChartTooltipPayload) => void;
    moveTooltip: (p: ChartTooltipPayload) => void;
    hideTooltip: () => void;
  };
  onItemClick?: (item: DivergingBarItemClickPayload) => void;
}) {
  const { resolved, style } = useTheme();
  const stylePreset = style as StylePreset;
  const margin = { top: 24, right: 16, bottom: 36, left: 16 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const midY = margin.top + innerH / 2;
  const centerX = margin.left + innerW / 2;

  const maxSide = Math.max(incomeMinor, expenseMinor, 1);
  const xScale = scaleLinear<number>({
    domain: [-maxSide, maxSide],
    range: [margin.left, margin.left + innerW],
  });

  const incomeColor = chartIncomeColor(resolved, stylePreset);
  const expenseColor = chartExpenseColor(resolved, stylePreset);
  const barH = Math.min(48, innerH * 0.35);
  const incomeX = xScale(0);
  const incomeW = xScale(incomeMinor) - incomeX;
  const expenseX = xScale(-expenseMinor);
  const expenseW = xScale(0) - expenseX;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="block max-w-full"
      role="img"
      aria-label="Income versus expense comparison"
    >
      <line
        x1={centerX}
        y1={margin.top}
        x2={centerX}
        y2={margin.top + innerH}
        stroke="var(--border)"
        strokeWidth={1}
      />
      <text
        x={centerX}
        y={margin.top - 6}
        textAnchor="middle"
        className="fill-muted text-[10px]"
      >
        Net {formatValue(incomeMinor - expenseMinor)}
      </text>
      <Group>
        <g className={animate ? "fx-chart-bar-grow" : undefined}>
          <rect
            x={incomeX}
            y={midY - barH - 8}
            width={Math.max(0, incomeW)}
            height={barH}
            rx={4}
            fill={incomeColor}
            opacity={0.92}
            pointerEvents="none"
          />
          <rect
            x={incomeX}
            y={midY - barH - 8}
            width={Math.max(incomeW, 8)}
            height={barH}
            fill="transparent"
            className={onItemClick ? "cursor-pointer" : "cursor-default"}
            onPointerEnter={(ev) =>
              tooltipApi.showTooltip(
                pointerPayload(ev, "Income", formatValue(incomeMinor)),
              )
            }
            onPointerMove={(ev) =>
              tooltipApi.moveTooltip(
                pointerPayload(ev, "Income", formatValue(incomeMinor)),
              )
            }
            onPointerLeave={() => tooltipApi.hideTooltip()}
            onClick={() => {
              if (!onItemClick) return;
              onItemClick({ kind: "income" });
            }}
          />
        </g>
        <text
          x={margin.left + innerW / 4}
          y={midY - barH - 14}
          textAnchor="middle"
          className="fill-muted text-[10px]"
        >
          Income
        </text>
        <g
          className={animate ? "fx-chart-bar-grow" : undefined}
          style={animate ? { animationDelay: "40ms" } : undefined}
        >
          <rect
            x={expenseX}
            y={midY + 8}
            width={Math.max(0, expenseW)}
            height={barH}
            rx={4}
            fill={expenseColor}
            opacity={0.92}
            pointerEvents="none"
          />
          <rect
            x={expenseX}
            y={midY + 8}
            width={Math.max(expenseW, 8)}
            height={barH}
            fill="transparent"
            className={onItemClick ? "cursor-pointer" : "cursor-default"}
            onPointerEnter={(ev) =>
              tooltipApi.showTooltip(
                pointerPayload(ev, "Expenses", formatValue(expenseMinor)),
              )
            }
            onPointerMove={(ev) =>
              tooltipApi.moveTooltip(
                pointerPayload(ev, "Expenses", formatValue(expenseMinor)),
              )
            }
            onPointerLeave={() => tooltipApi.hideTooltip()}
            onClick={() => {
              if (!onItemClick) return;
              onItemClick({ kind: "expense" });
            }}
          />
        </g>
        <text
          x={margin.left + (innerW * 3) / 4}
          y={midY + barH + 22}
          textAnchor="middle"
          className="fill-muted text-[10px]"
        >
          Expenses
        </text>
      </Group>
    </svg>
  );
}
