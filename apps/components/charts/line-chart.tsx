"use client";

import { curveMonotoneX } from "@visx/curve";
import { Group } from "@visx/group";
import { LinePath } from "@visx/shape";
import { ParentSize } from "@visx/responsive";
import { scaleLinear, scalePoint } from "@visx/scale";

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
        <LinePath
          data={points}
          x={(p) => p.x}
          y={(p) => p.y}
          stroke="currentColor"
          strokeWidth={2}
          curve={curveMonotoneX}
          opacity={0.85}
        />
      </Group>
    </svg>
  );
}
