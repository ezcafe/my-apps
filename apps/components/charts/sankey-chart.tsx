"use client";

import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { Sankey, sankeyJustify, type SankeyNode } from "@visx/sankey";
import { BarRounded, LinkHorizontal } from "@visx/shape";
import { colorByIndex } from "@/components/charts/chart-colors";
import { ChartShell } from "@/components/charts/chart-shell";
import type { ChartTooltipPayload } from "@/components/charts/use-chart-tooltip";
import type { StylePreset } from "@/components/theme-provider";
import { useTheme } from "@/components/theme-provider";
import { formatMinor } from "@/lib/format-money";

type Link = { source: string; target: string; value: number };

type NodeDatum = { name: string; label: string };
type LinkDatum = { value: number };

function truncateLabel(name: string, maxChars: number): string {
  if (name.length <= maxChars) return name;
  return `${name.slice(0, Math.max(0, maxChars - 1))}…`;
}

function pointerPayload(
  e: React.PointerEvent,
  label: string,
  valueText: string,
): ChartTooltipPayload {
  return { label, valueText, clientX: e.clientX, clientY: e.clientY };
}

export function SankeyChart({
  nodes,
  links,
  currency = "USD",
  animate = true,
}: {
  nodes: { id: string; name: string }[];
  links: Link[];
  currency?: string;
  animate?: boolean;
}) {
  const { resolved, style } = useTheme();
  return (
    <ChartShell className="relative size-full min-h-0 min-w-0">
      {(tooltipApi) => (
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
                animate={animate}
                tooltipApi={tooltipApi}
              />
            ) : null
          }
        </ParentSize>
      )}
    </ChartShell>
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
  animate,
  tooltipApi,
}: {
  width: number;
  height: number;
  nodes: { id: string; name: string }[];
  links: Link[];
  resolved: "light" | "dark";
  stylePreset: StylePreset;
  currency: string;
  animate?: boolean;
  tooltipApi: {
    showTooltip: (p: ChartTooltipPayload) => void;
    moveTooltip: (p: ChartTooltipPayload) => void;
    hideTooltip: () => void;
  };
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

  const nodeObjs: NodeDatum[] = uniq.map((id) => ({
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
  const chartW = width - marginX * 2;
  const chartH = height - legendH - marginX;

  const root = { nodes: nodeObjs, links: linkObjs };

  const labelMaxChars = width < 400 ? 14 : width < 560 ? 22 : 36;

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
      <Group top={legendH} left={marginX}>
        <Sankey<NodeDatum, LinkDatum>
          root={root}
          nodeWidth={12}
          nodePadding={nodePadding}
          nodeAlign={sankeyJustify}
          size={[chartW, chartH]}
        >
          {({ graph, createPath }) => (
            <>
              <Group>
                {graph.links.map((link, i) => {
                  const sourceNode = link.source as SankeyNode<NodeDatum, LinkDatum>;
                  const targetNode = link.target as SankeyNode<NodeDatum, LinkDatum>;
                  const srcIdx = graph.nodes.indexOf(
                    sourceNode as (typeof graph.nodes)[number],
                  );
                  const colorIdx = srcIdx >= 0 ? srcIdx : i;
                  const strokeW = Math.max(0.75, link.width ?? 0.75);
                  const amount = Number(link.value ?? 0);
                  const tipLabel = `${sourceNode.label} → ${targetNode.label}`;
                  const tipValue = formatMinor(amount, currency);
                  const hitW = Math.max(14, strokeW * 2.5);
                  const linkKey = `${sourceNode.name}→${targetNode.name}:${String(link.value ?? 0)}:${i}`;

                  return (
                    <g
                      key={linkKey}
                      className={animate ? "fx-chart-enter" : undefined}
                      style={animate ? { animationDelay: `${i * 25}ms` } : undefined}
                    >
                      <LinkHorizontal
                        data={link}
                        path={createPath}
                        fill="none"
                        stroke="transparent"
                        strokeOpacity={0}
                        strokeWidth={hitW}
                        pointerEvents="stroke"
                        className="cursor-default"
                        onPointerEnter={(e) =>
                          tooltipApi.showTooltip(
                            pointerPayload(e, tipLabel, tipValue),
                          )
                        }
                        onPointerMove={(e) =>
                          tooltipApi.moveTooltip(
                            pointerPayload(e, tipLabel, tipValue),
                          )
                        }
                        onPointerLeave={() => tooltipApi.hideTooltip()}
                      />
                      <LinkHorizontal
                        data={link}
                        path={createPath}
                        fill="none"
                        stroke={colorByIndex(resolved, colorIdx, stylePreset)}
                        strokeOpacity={0.42}
                        strokeWidth={strokeW}
                        pointerEvents="none"
                      />
                    </g>
                  );
                })}
              </Group>
              <Group>
                {graph.nodes.map((node, i) => {
                  const { x0, x1, y0, y1 } = node;
                  if (
                    x0 === undefined ||
                    x1 === undefined ||
                    y0 === undefined ||
                    y1 === undefined
                  ) {
                    return null;
                  }

                  const nd = node as SankeyNode<NodeDatum, LinkDatum>;
                  const inSum = graph.links
                    .filter((l) => l.target === node)
                    .reduce((s, l) => s + Number(l.value ?? 0), 0);
                  const outSum = graph.links
                    .filter((l) => l.source === node)
                    .reduce((s, l) => s + Number(l.value ?? 0), 0);
                  const nodeThrough = Math.max(inSum, outSum);
                  const tipLabel = nd.label;
                  const tipValue = `Total through: ${formatMinor(nodeThrough, currency)}`;
                  const nodeW = x1 - x0;
                  const nodeH = y1 - y0;
                  const labelOnLeft = x0 < chartW / 2;

                  return (
                    <g
                      key={`${nd.name}-${i}`}
                      className={animate ? "fx-chart-enter" : undefined}
                      style={animate ? { animationDelay: `${i * 30}ms` } : undefined}
                    >
                      <BarRounded
                        x={x0}
                        y={y0}
                        width={nodeW}
                        height={nodeH}
                        radius={2}
                        all
                        fill={colorByIndex(resolved, i, stylePreset)}
                        opacity={0.88}
                        className="cursor-default"
                        onPointerEnter={(e) =>
                          tooltipApi.showTooltip(
                            pointerPayload(e, tipLabel, tipValue),
                          )
                        }
                        onPointerMove={(e) =>
                          tooltipApi.moveTooltip(
                            pointerPayload(e, tipLabel, tipValue),
                          )
                        }
                        onPointerLeave={() => tooltipApi.hideTooltip()}
                      />
                      <text
                        x={labelOnLeft ? x0 + 6 : x1 - 6}
                        y={y0 + nodeH / 2}
                        dominantBaseline="middle"
                        textAnchor={labelOnLeft ? "start" : "end"}
                        className="fill-foreground pointer-events-none text-[10px]"
                      >
                        {truncateLabel(nd.label, labelMaxChars)}
                      </text>
                    </g>
                  );
                })}
              </Group>
            </>
          )}
        </Sankey>
      </Group>
    </svg>
  );
}
