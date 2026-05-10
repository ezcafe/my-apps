"use client";

import { curveMonotoneX } from "@visx/curve";
import { Group } from "@visx/group";
import { LinePath } from "@visx/shape";
import { ParentSize } from "@visx/responsive";
import { scaleLinear, scalePoint } from "@visx/scale";
import { colorByIndex } from "@/components/charts/chart-colors";

type Point = { date: string; cumulative: number };

export function LineChart({ data }: { data: Point[] }) {
  return (
    <ParentSize className="size-full min-h-0 min-w-0">
      {({ width, height }) =>
        width > 0 && height > 0 ? (
          <LineInner width={width} height={height} data={data} />
        ) : null
      }
    </ParentSize>
  );
}

function LineInner({
  width,
  height,
  data,
}: {
  width: number;
  height: number;
  data: Point[];
}) {
  const margin = { top: 12, right: 12, bottom: 28, left: 48 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const dates = data.map((d) => d.date);
  const xScale = scalePoint<string>({
    domain: dates,
    range: [0, innerW],
    padding: 0,
  });

  const extents = data.map((d) => d.cumulative);
  const minY = Math.min(0, ...extents);
  const maxY = Math.max(1, ...extents);
  const yScale = scaleLinear<number>({
    domain: [minY, maxY],
    range: [innerH, 0],
  });

  const points = data.map((d) => ({
    x: xScale(d.date) ?? 0,
    y: yScale(d.cumulative),
  }));

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="block max-w-full"
    >
      <Group left={margin.left} top={margin.top}>
        <defs>
          <linearGradient id="analytics-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colorByIndex(0)} />
            <stop offset="50%" stopColor={colorByIndex(4)} />
            <stop offset="100%" stopColor={colorByIndex(6)} />
          </linearGradient>
        </defs>
        <LinePath
          data={points}
          x={(p) => p.x}
          y={(p) => p.y}
          stroke="url(#analytics-line-gradient)"
          strokeWidth={2}
          curve={curveMonotoneX}
          opacity={0.95}
        />
        {points.map((p, i) => (
          <circle
            key={`pt-${i}`}
            cx={p.x}
            cy={p.y}
            r={2.25}
            fill={colorByIndex(i)}
            opacity={0.95}
          />
        ))}
      </Group>
    </svg>
  );
}
