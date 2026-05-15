"use client";

import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { scaleBand, scaleLinear } from "@visx/scale";
import { chartExpenseHotPastel, colorByIndex } from "@/components/charts/chart-colors";
import type { StylePreset } from "@/components/theme-provider";
import { useTheme } from "@/components/theme-provider";
import { useFormatDate } from "@/lib/format-date";

type Row = { month: string; expenseMinor: number; incomeMinor: number };

const BAR_CORNER_PX = 4;

/** Rounded rect with per-corner control so stacked segments meet on a straight edge. */
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

export function ColumnChart({ data }: { data: Row[] }) {
  const { resolved, style } = useTheme();
  const { formatMonthYear } = useFormatDate();
  return (
    <ParentSize className="size-full min-h-0 min-w-0">
      {({ width, height }) =>
        width > 0 && height > 0 ? (
          <ColumnInner
            width={width}
            height={height}
            data={data}
            formatMonthLabel={formatMonthYear}
            resolved={resolved}
            stylePreset={style}
          />
        ) : null
      }
    </ParentSize>
  );
}

function ColumnInner({
  width,
  height,
  data,
  formatMonthLabel,
  resolved,
  stylePreset,
}: {
  width: number;
  height: number;
  data: Row[];
  formatMonthLabel: (yyyyMm: string) => string;
  resolved: "light" | "dark";
  stylePreset: StylePreset;
}) {
  const margin = { top: 12, right: 8, bottom: 36, left: 44 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const xScale = scaleBand<string>({
    domain: data.map((d) => d.month),
    range: [0, innerW],
    padding: 0.25,
  });

  const totals = data.map((d) => d.expenseMinor + d.incomeMinor);
  const maxY = Math.max(1, ...totals);
  const yScale = scaleLinear<number>({
    domain: [0, maxY],
    range: [innerH, 0],
  });

  const expenseColor = chartExpenseHotPastel(stylePreset, resolved);
  const incomeColor = colorByIndex(resolved, 3, stylePreset);

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
        {data.map((d) => {
          const x = xScale(d.month);
          if (x == null) return null;
          const barW = xScale.bandwidth();
          const e = d.expenseMinor;
          const inc = d.incomeMinor;
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

          return (
            <Group key={d.month}>
              {e > 0 ? (
                <path
                  d={roundedRectPath(x, yExpense, barW, hExpense, BAR_CORNER_PX, expenseCorners)}
                  fill={expenseColor}
                  opacity={0.9}
                />
              ) : null}
              {inc > 0 ? (
                <path
                  d={roundedRectPath(x, yTotal, barW, hIncome, BAR_CORNER_PX, incomeCorners)}
                  fill={incomeColor}
                  opacity={0.9}
                />
              ) : null}
            </Group>
          );
        })}
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
