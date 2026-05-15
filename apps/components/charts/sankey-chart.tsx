"use client";

import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import {
  sankey as d3Sankey,
  sankeyJustify,
  sankeyLinkHorizontal,
} from "d3-sankey";
import { colorByIndex } from "@/components/charts/chart-colors";
import type { StylePreset } from "@/components/theme-provider";
import { useTheme } from "@/components/theme-provider";
import { formatMinor } from "@/lib/format-money";

type Link = { source: string; target: string; value: number };

type SankeyNodeDatum = { name: string; label: string };

function truncateLabel(name: string, maxChars: number): string {
  if (name.length <= maxChars) return name;
  return `${name.slice(0, Math.max(0, maxChars - 1))}…`;
}

export function SankeyChart({
  nodes,
  links,
  currency = "USD",
}: {
  nodes: { id: string; name: string }[];
  links: Link[];
  /** ISO 4217 code; amounts in `links` are minor units (cents). */
  currency?: string;
}) {
  const { resolved, style } = useTheme();
  return (
    <ParentSize className="size-full min-h-0 min-w-0">
      {({ width, height }) =>
        width > 0 && height > 0 ? (
          <SankeyInner
            width={width}
            height={height}
            nodes={nodes}
            links={links}
            resolved={resolved}
            stylePreset={style}
            currency={currency}
          />
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
  resolved,
  stylePreset,
  currency,
}: {
  width: number;
  height: number;
  nodes: { id: string; name: string }[];
  links: Link[];
  resolved: "light" | "dark";
  stylePreset: StylePreset;
  currency: string;
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
          Add categorized expenses or income to see flows
        </text>
      </svg>
    );
  }

  const labelById = new Map(rawNodes.map((n) => [n.id, n.name]));
  for (const l of rawLinks) {
    if (!labelById.has(l.source)) labelById.set(l.source, l.source);
    if (!labelById.has(l.target)) labelById.set(l.target, l.target);
  }
  const uniq = [...labelById.keys()];

  const nodeObjs: SankeyNodeDatum[] = uniq.map((id) => ({
    name: id,
    label: labelById.get(id) ?? id,
  }));
  const index = new Map(uniq.map((n, i) => [n, i]));
  const linkObjs = rawLinks.map((l) => ({
    source: index.get(l.source)!,
    target: index.get(l.target)!,
    value: Math.max(l.value, 0),
  }));

  const nodePadding = width < 420 ? 6 : width < 640 ? 8 : 10;
  const marginX = 4;
  const hasBudgetNodes = rawNodes.some((n) => n.id.startsWith("b:"));
  const legendH = hasBudgetNodes ? 42 : 34;

  const layout = d3Sankey<SankeyNodeDatum, { value: number }>()
    .nodeWidth(12)
    .nodePadding(nodePadding)
    .extent([
      [marginX, legendH],
      [width - marginX, height - marginX],
    ])
    .nodeAlign(sankeyJustify);

  const { nodes: laidOut, links: laidLinks } = layout({
    nodes: nodeObjs,
    links: linkObjs,
  });

  const labelMaxChars = width < 400 ? 14 : width < 560 ? 22 : 36;

  const linkKey = (link: (typeof laidLinks)[number], i: number) => {
    const s = link.source as SankeyNodeDatum;
    const t = link.target as SankeyNodeDatum;
    return `${s.name}→${t.name}:${String(link.value ?? 0)}:${i}`;
  };

  const ariaLabel = hasBudgetNodes
    ? "Money flow diagram: expenses may run account to category, sometimes through an account budget, " +
      "then into category or workspace budgets when configured; income runs category to account. " +
      "Hover a band for amounts."
    : "Money flow diagram: expense amounts flow from accounts on the left to categories on the right; " +
      "income flows from categories on the left into accounts on the right. " +
      "Hover a band to read the exact amount in a tooltip.";

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="touch-none block max-w-full text-muted"
      role="img"
      aria-label={ariaLabel}
    >
      <g fontSize={10} className="fill-muted">
        {hasBudgetNodes ? (
          <>
            <text x={marginX} y={13}>
              Expense: account → category → budget (account budget may sit before category)
            </text>
            <text x={marginX} y={27}>
              Income: category → account
            </text>
          </>
        ) : (
          <>
            <text x={marginX} y={14}>
              Expense: account → category
            </text>
            <text x={marginX} y={28}>
              Income: category → account
            </text>
          </>
        )}
      </g>
      <Group>
        {laidLinks.map((link, i) => {
          const path = sankeyLinkHorizontal()(link);
          if (!path) return null;
          const sourceNode = link.source as SankeyNodeDatum & (typeof laidOut)[number];
          const targetNode = link.target as SankeyNodeDatum & (typeof laidOut)[number];
          const srcIdx = laidOut.indexOf(sourceNode as (typeof laidOut)[number]);
          const colorIdx = srcIdx >= 0 ? srcIdx : i;
          const strokeW = Math.max(0.75, link.width ?? 0.75);
          const amount = Number(link.value ?? 0);
          const tip = `${sourceNode.label} → ${targetNode.label}: ${formatMinor(amount, currency)}`;
          const hitW = Math.max(14, strokeW * 2.5);
          return (
            <g key={linkKey(link, i)}>
              <path
                d={path}
                fill="none"
                stroke="transparent"
                strokeOpacity={0}
                strokeWidth={hitW}
                pointerEvents="stroke"
              >
                <title>{tip}</title>
              </path>
              <path
                d={path}
                fill="none"
                stroke={colorByIndex(resolved, colorIdx, stylePreset)}
                strokeOpacity={0.42}
                strokeWidth={strokeW}
                pointerEvents="none"
              />
            </g>
          );
        })}
        {laidOut.map((node, i) => {
          const nd = node as SankeyNodeDatum & (typeof laidOut)[number];
          const inSum = laidLinks
            .filter((l) => (l.target as (typeof laidOut)[number]) === node)
            .reduce((s, l) => s + Number(l.value ?? 0), 0);
          const outSum = laidLinks
            .filter((l) => (l.source as (typeof laidOut)[number]) === node)
            .reduce((s, l) => s + Number(l.value ?? 0), 0);
          const nodeThrough = Math.max(inSum, outSum);
          const nodeTip = `${nd.label}. Total through: ${formatMinor(nodeThrough, currency)}`;
          return (
            <Group key={`${nd.name}-${i}`} top={node.y0 ?? 0} left={node.x0 ?? 0}>
              <rect
                height={(node.y1 ?? 0) - (node.y0 ?? 0)}
                width={(node.x1 ?? 0) - (node.x0 ?? 0)}
                fill={colorByIndex(resolved, i, stylePreset)}
                opacity={0.88}
                rx={2}
              >
                <title>{nodeTip}</title>
              </rect>
              <text
                x={(node.x0 ?? 0) < width / 2 ? 6 : -6}
                y={((node.y1 ?? 0) - (node.y0 ?? 0)) / 2}
                dominantBaseline="middle"
                textAnchor={(node.x0 ?? 0) < width / 2 ? "start" : "end"}
                className="fill-foreground text-[10px]"
                transform={`translate(${(node.x1 ?? 0) - (node.x0 ?? 0)},0)`}
              >
                {truncateLabel(nd.label, labelMaxChars)}
              </text>
            </Group>
          );
        })}
      </Group>
    </svg>
  );
}
