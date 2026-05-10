"use client";

import { Group } from "@visx/group";
import Pie from "@visx/shape/lib/shapes/Pie";
import { ParentSize } from "@visx/responsive";
import { colorByIndex } from "@/components/charts/chart-colors";

type Datum = { label: string; valueMinor: number };

export function PieSpendChart({ data }: { data: Datum[] }) {
  return (
    <ParentSize className="size-full min-h-0 min-w-0">
      {({ width, height }) =>
        width > 0 && height > 0 ? (
          <PieInner width={width} height={height} data={data} />
        ) : null
      }
    </ParentSize>
  );
}

function PieInner({
  width,
  height,
  data,
}: {
  width: number;
  height: number;
  data: Datum[];
}) {
  const radius = Math.min(width, height) / 2 - 12;
  const centerY = height / 2;
  const centerX = width / 2;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="block max-w-full"
    >
      <Group top={centerY} left={centerX}>
        <Pie
          data={data.filter((d) => d.valueMinor > 0)}
          pieValue={(d) => d.valueMinor}
          outerRadius={radius}
          innerRadius={radius * 0.55}
          padAngle={0.02}
        >
          {(provided) =>
            provided.arcs.map((arc, i) => (
              <path
                key={`arc-${arc.data.label}-${i}`}
                d={provided.path(arc) ?? ""}
                fill={colorByIndex(i)}
                opacity={0.9}
              />
            ))
          }
        </Pie>
      </Group>
    </svg>
  );
}
