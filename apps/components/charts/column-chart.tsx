"use client";

import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Bar } from "@visx/shape";

type Row = { month: string; expenseMinor: number };

export function ColumnChart({ data }: { data: Row[] }) {
  return (
    <ParentSize className="size-full min-h-0 min-w-0">
      {({ width, height }) =>
        width > 0 && height > 0 ? (
          <ColumnInner width={width} height={height} data={data} />
        ) : null
      }
    </ParentSize>
  );
}

function ColumnInner({
  width,
  height,
  data,
}: {
  width: number;
  height: number;
  data: Row[];
}) {
  const margin = { top: 12, right: 8, bottom: 36, left: 44 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const xScale = scaleBand<string>({
    domain: data.map((d) => d.month),
    range: [0, innerW],
    padding: 0.25,
  });

  const maxY = Math.max(1, ...data.map((d) => d.expenseMinor));
  const yScale = scaleLinear<number>({
    domain: [0, maxY],
    range: [innerH, 0],
  });

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="block max-w-full"
    >
      <Group left={margin.left} top={margin.top}>
        {data.map((d) => {
          const x = xScale(d.month);
          if (x == null) return null;
          const barW = xScale.bandwidth();
          const barH = innerH - (yScale(d.expenseMinor) ?? 0);
          const y = yScale(d.expenseMinor);
          return (
            <Bar
              key={d.month}
              x={x}
              y={y}
              width={barW}
              height={barH}
              fill="currentColor"
              opacity={0.65}
              rx={4}
            />
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
              {d.month.slice(5)}
            </text>
          );
        })}
      </Group>
    </svg>
  );
}
