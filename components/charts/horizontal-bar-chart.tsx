"use client";

import { Group } from "@visx/group";
import { ChartParentSize } from "@/components/charts/chart-parent-size";
import { scaleBand, scaleLinear } from "@visx/scale";
import { BarRounded } from "@visx/shape";
import { colorByIndex } from "@/components/charts/chart-colors";
import { ChartShell } from "@/components/charts/chart-shell";
import type { ChartTooltipPayload } from "@/components/charts/use-chart-tooltip";
import type { StylePreset } from "@/components/theme-provider";
import { useTheme } from "@/components/theme-provider";

export type HorizontalBarRow = {
  key: string;
  label: string;
  valueMinor: number;
  limitMinor?: number;
  overLimit?: boolean;
};

function pointerPayload(
  e: React.PointerEvent,
  label: string,
  valueText: string,
): ChartTooltipPayload {
  return { label, valueText, clientX: e.clientX, clientY: e.clientY };
}

export type HorizontalBarItemClickPayload = {
  key: string;
  label: string;
};

export function HorizontalBarChart({
  data,
  formatValue,
  animate = true,
  variant = "simple",
  onItemClick,
}: {
  data: HorizontalBarRow[];
  formatValue: (minor: number) => string;
  animate?: boolean;
  /** `budget` draws limit track behind spent bar. */
  variant?: "simple" | "budget";
  onItemClick?: (item: HorizontalBarItemClickPayload) => void;
}) {
  const visible = data.filter((d) => d.valueMinor > 0 || (d.limitMinor ?? 0) > 0);
  const isEmpty = visible.length === 0;

  return (
    <ChartShell isEmpty={isEmpty} emptyMessage="No data to display">
      {(tooltipApi) => (
        <ChartParentSize>
          {({ width, height }) => (
            <HorizontalBarInner
              width={width}
              height={height}
              data={visible}
              variant={variant}
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

function HorizontalBarInner({
  width,
  height,
  data,
  variant,
  animate,
  formatValue,
  tooltipApi,
  onItemClick,
}: {
  width: number;
  height: number;
  data: HorizontalBarRow[];
  variant: "simple" | "budget";
  animate?: boolean;
  formatValue: (minor: number) => string;
  tooltipApi: {
    showTooltip: (p: ChartTooltipPayload) => void;
    moveTooltip: (p: ChartTooltipPayload) => void;
    hideTooltip: () => void;
  };
  onItemClick?: (item: HorizontalBarItemClickPayload) => void;
}) {
  const { resolved, style } = useTheme();
  const stylePreset = style as StylePreset;
  const margin = { top: 4, right: 8, bottom: 4, left: 4 };
  const labelCol = Math.min(140, width * 0.38);
  const innerW = width - margin.left - margin.right - labelCol;
  const innerH = height - margin.top - margin.bottom;

  const yScale = scaleBand<string>({
    domain: data.map((d) => d.key),
    range: [0, innerH],
    padding: 0.22,
  });

  const maxVal = Math.max(
    1,
    ...data.map((d) =>
      variant === "budget"
        ? Math.max(d.valueMinor, d.limitMinor ?? 0)
        : d.valueMinor,
    ),
  );
  const xScale = scaleLinear<number>({
    domain: [0, maxVal],
    range: [0, innerW],
  });

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="block max-w-full"
      role="img"
      aria-label="Horizontal bar chart"
    >
      <Group left={margin.left} top={margin.top}>
        {data.map((d, i) => {
          const y = yScale(d.key);
          if (y == null) return null;
          const barH = yScale.bandwidth();
          const fill = d.overLimit
            ? "var(--destructive)"
            : colorByIndex(resolved, i, stylePreset);
          const limitW =
            variant === "budget" && d.limitMinor
              ? xScale(d.limitMinor) ?? 0
              : 0;
          const valueW = xScale(d.valueMinor) ?? 0;
          const tooltip =
            variant === "budget" && d.limitMinor
              ? `${formatValue(d.valueMinor)} / ${formatValue(d.limitMinor)}`
              : formatValue(d.valueMinor);

          return (
            <Group key={d.key} top={y}>
              <text
                x={0}
                y={barH / 2}
                dy="0.32em"
                className="fill-foreground text-[10px]"
                textAnchor="start"
              >
                {d.label.length > 22 ? `${d.label.slice(0, 21)}…` : d.label}
              </text>
              <Group left={labelCol}>
                {variant === "budget" && limitW > 0 ? (
                  <BarRounded
                    width={limitW}
                    height={barH}
                    radius={4}
                    fill="color-mix(in oklab, var(--foreground) 12%, transparent)"
                    y={0}
                    x={0}
                  />
                ) : null}
                <g
                  className={animate ? "fx-chart-bar-grow" : undefined}
                  style={animate ? { animationDelay: `${i * 35}ms` } : undefined}
                >
                  <BarRounded
                    width={Math.max(valueW, 0)}
                    height={barH}
                    radius={4}
                    fill={fill}
                    y={0}
                    x={0}
                    className="transition-opacity duration-150"
                    opacity={0.92}
                    pointerEvents="none"
                  />
                  <rect
                    x={0}
                    y={0}
                    width={Math.max(valueW, limitW, 8)}
                    height={barH}
                    fill="transparent"
                    className={onItemClick ? "cursor-pointer" : "cursor-default"}
                    onPointerEnter={(ev) =>
                      tooltipApi.showTooltip(pointerPayload(ev, d.label, tooltip))
                    }
                    onPointerMove={(ev) =>
                      tooltipApi.moveTooltip(pointerPayload(ev, d.label, tooltip))
                    }
                    onPointerLeave={() => tooltipApi.hideTooltip()}
                    onClick={() => {
                      if (!onItemClick) return;
                      onItemClick({ key: d.key, label: d.label });
                    }}
                  />
                </g>
              </Group>
            </Group>
          );
        })}
      </Group>
    </svg>
  );
}
