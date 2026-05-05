"use client";

import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import {
  sankey as d3Sankey,
  sankeyJustify,
  sankeyLinkHorizontal,
} from "d3-sankey";

type Link = { source: string; target: string; value: number };

export function SankeyChart({
  nodes,
  links,
}: {
  nodes: { name: string }[];
  links: Link[];
}) {
  return (
    <ParentSize className="size-full min-h-0 min-w-0">
      {({ width, height }) =>
        width > 0 && height > 0 ? (
          <SankeyInner width={width} height={height} nodes={nodes} links={links} />
        ) : null
      }
    </ParentSize>
  );
}

function SankeyInner({
  width,
  height,
  nodes: rawNodes,
  links: rawLinks,
}: {
  width: number;
  height: number;
  nodes: { name: string }[];
  links: Link[];
}) {
  if (!rawLinks.length) {
    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="block max-w-full"
      >
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          className="fill-muted text-sm"
        >
          Add expense transactions to see account → category flows
        </text>
      </svg>
    );
  }

  const names = [...new Set(rawNodes.map((n) => n.name))];
  rawLinks.forEach((l) => {
    names.push(l.source, l.target);
  });
  const uniq = [...new Set(names)];

  const nodeObjs = uniq.map((name) => ({ name }));
  const index = new Map(uniq.map((n, i) => [n, i]));
  const linkObjs = rawLinks.map((l) => ({
    source: index.get(l.source)!,
    target: index.get(l.target)!,
    value: Math.max(l.value, 1),
  }));

  const layout = d3Sankey<{ name: string }, { value: number }>()
    .nodeWidth(12)
    .nodePadding(10)
    .extent([
      [2, 2],
      [width - 2, height - 2],
    ])
    .nodeAlign(sankeyJustify);

  const { nodes: laidOut, links: laidLinks } = layout({
    nodes: nodeObjs,
    links: linkObjs,
  });

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="touch-none block max-w-full"
    >
      <Group>
        {laidLinks.map((link, i) => {
          const path = sankeyLinkHorizontal()(link);
          if (!path) return null;
          return (
            <path
              key={i}
              d={path}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.35}
              strokeWidth={Math.max(1, link.width ?? 1)}
            />
          );
        })}
        {laidOut.map((node, i) => (
          <Group key={i} top={node.y0 ?? 0} left={node.x0 ?? 0}>
            <rect
              height={(node.y1 ?? 0) - (node.y0 ?? 0)}
              width={(node.x1 ?? 0) - (node.x0 ?? 0)}
              fill="currentColor"
              opacity={0.25}
              rx={2}
            />
            <text
              x={(node.x0 ?? 0) < width / 2 ? 6 : -6}
              y={((node.y1 ?? 0) - (node.y0 ?? 0)) / 2}
              dominantBaseline="middle"
              textAnchor={(node.x0 ?? 0) < width / 2 ? "start" : "end"}
              className="fill-foreground text-[10px]"
              transform={`translate(${(node.x1 ?? 0) - (node.x0 ?? 0)},0)`}
            >
              {node.name}
            </text>
          </Group>
        ))}
      </Group>
    </svg>
  );
}
