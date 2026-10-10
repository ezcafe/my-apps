"use client";

import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Bar, LinePath } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { useId } from "react";
import { ChartParentSize } from "@/components/charts/chart-parent-size";
import { ChartShell } from "@/components/charts/chart-shell";
import { colorByIndex } from "@/components/charts/chart-colors";
import { useTheme } from "@/components/theme-provider";
import {
  formatWeatherHourTick,
  formatWeatherPm25Tooltip,
  formatWeatherRainTooltip,
  formatWeatherTempTooltip,
  formatWeatherYTick,
  isWeatherChartEmpty,
  isWeatherLineValueDefined,
  WEATHER_HOUR_TICKS,
  weatherDayYDomain,
} from "@/components/weather/weather-day-chart-helpers";
import { prefersReducedMotion } from "@/lib/microinteractions";

export type WeatherDayChartPoint = {
  hour: number;
  value: number | null;
  extra?: { rainProbPct?: number | null };
};

/** Serializable tooltip mode — never pass functions from RSC into this client chart. */
export type WeatherDayTooltipKind = "temp" | "pm25" | "rain";

const MARGIN = { top: 8, right: 8, bottom: 28, left: 40 };
const Y_TICK_LABEL_X = -8;

function tooltipLabel(
  kind: WeatherDayTooltipKind,
  point: WeatherDayChartPoint,
): string {
  const value = point.value as number;
  if (kind === "temp") return formatWeatherTempTooltip(point.hour, value);
  if (kind === "pm25") return formatWeatherPm25Tooltip(point.hour, value);
  return formatWeatherRainTooltip(
    point.hour,
    value,
    point.extra?.rainProbPct ?? null,
  );
}

export function WeatherDayChart({
  kind,
  points,
  nowIndex,
  colorIndex,
  ariaLabel,
  tooltipKind,
}: {
  kind: "line" | "bars";
  points: WeatherDayChartPoint[];
  nowIndex: number;
  colorIndex: number;
  ariaLabel: string;
  tooltipKind: WeatherDayTooltipKind;
}) {
  const values = points.map((p) => p.value);
  const isEmpty = isWeatherChartEmpty(values);

  return (
    <div className="h-48 min-h-48 w-full min-w-0">
      <ChartShell isEmpty={isEmpty} emptyMessage="No data for this period">
        {(tooltipApi) => (
          <ChartParentSize>
            {({ width, height }) =>
              width < 10 || height < 10 ? null : (
                <WeatherDayChartInner
                  kind={kind}
                  width={width}
                  height={height}
                  points={points}
                  nowIndex={nowIndex}
                  colorIndex={colorIndex}
                  ariaLabel={ariaLabel}
                  tooltipKind={tooltipKind}
                  tooltipApi={tooltipApi}
                />
              )
            }
          </ChartParentSize>
        )}
      </ChartShell>
    </div>
  );
}

function WeatherDayChartInner({
  kind,
  width,
  height,
  points,
  nowIndex,
  colorIndex,
  ariaLabel,
  tooltipKind,
  tooltipApi,
}: {
  kind: "line" | "bars";
  width: number;
  height: number;
  points: WeatherDayChartPoint[];
  nowIndex: number;
  colorIndex: number;
  ariaLabel: string;
  tooltipKind: WeatherDayTooltipKind;
  tooltipApi: ReturnType<
    typeof import("@/components/charts/use-chart-tooltip").useChartTooltip
  >;
}) {
  const { resolved, style } = useTheme();
  const stroke = colorByIndex(resolved, colorIndex, style);
  const clipId = useId();
  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = height - MARGIN.top - MARGIN.bottom;
  const reducedMotion = prefersReducedMotion();

  const values = points.map((p) => p.value);
  const [yMin, yMax] = weatherDayYDomain(values);

  const yScale = scaleLinear<number>({
    domain: [yMin, yMax],
    range: [innerH, 0],
    nice: true,
  });

  const xLineScale = scaleLinear<number>({
    domain: [0, 23],
    range: [0, innerW],
  });

  const xBandScale = scaleBand<number>({
    domain: Array.from({ length: 24 }, (_, i) => i),
    range: [0, innerW],
    padding: 0.2,
  });

  const nowX =
    kind === "line"
      ? xLineScale(nowIndex)
      : (xBandScale(nowIndex) ?? 0) + (xBandScale.bandwidth() ?? 0) / 2;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="block max-w-full text-muted"
      role="img"
      aria-label={ariaLabel}
    >
      <Group left={MARGIN.left} top={MARGIN.top}>
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={innerW} height={innerH} />
          </clipPath>
        </defs>
        {yScale.ticks(4).map((t, i) => (
          <line
            key={`grid-${i}`}
            x1={0}
            x2={innerW}
            y1={yScale(t)}
            y2={yScale(t)}
            stroke="var(--border)"
            strokeOpacity={0.4}
          />
        ))}
        {yScale.ticks(4).map((t, i) => (
          <g key={`yt-${i}`}>
            <line
              x1={-5}
              y1={yScale(t)}
              x2={0}
              y2={yScale(t)}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text
              x={Y_TICK_LABEL_X}
              y={yScale(t)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted text-[10px] tabular-nums"
            >
              {formatWeatherYTick(t, tooltipKind)}
            </text>
          </g>
        ))}
        <Group clipPath={`url(#${clipId})`}>
          {kind === "line" ? (
            <LinePath
              data={points}
              x={(p) => xLineScale(p.hour)}
              y={(p) => yScale(p.value ?? 0)}
              stroke={stroke}
              strokeWidth={2}
              curve={curveMonotoneX}
              defined={(p) => isWeatherLineValueDefined(p.value)}
              opacity={reducedMotion ? 1 : 0.95}
            />
          ) : (
            points.map((p) => {
              if (p.value == null) return null;
              const x = xBandScale(p.hour);
              if (x == null) return null;
              const barH = innerH - yScale(p.value);
              return (
                <Bar
                  key={`bar-${p.hour}`}
                  x={x}
                  y={yScale(p.value)}
                  width={xBandScale.bandwidth()}
                  height={Math.max(0, barH)}
                  fill={stroke}
                  rx={2}
                />
              );
            })
          )}
          {nowX >= 0 && nowX <= innerW ? (
            <line
              x1={nowX}
              x2={nowX}
              y1={0}
              y2={innerH}
              stroke="var(--accent)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              opacity={0.85}
            />
          ) : null}
        </Group>
        {WEATHER_HOUR_TICKS.map((h) => {
          const x =
            kind === "line"
              ? xLineScale(h)
              : (xBandScale(h) ?? 0) + (xBandScale.bandwidth() ?? 0) / 2;
          return (
            <text
              key={`tick-${h}`}
              x={x}
              y={innerH + 18}
              textAnchor="middle"
              className="fill-muted text-[10px] tabular-nums"
            >
              {formatWeatherHourTick(h)}
            </text>
          );
        })}
        {points.map((p) => {
          const x =
            kind === "line"
              ? xLineScale(p.hour)
              : (xBandScale(p.hour) ?? 0) + (xBandScale.bandwidth() ?? 0) / 2;
          return (
            <rect
              key={`hit-${p.hour}`}
              x={x - 8}
              y={0}
              width={16}
              height={innerH}
              fill="transparent"
              className="cursor-default"
              onPointerEnter={(ev) =>
                p.value != null &&
                tooltipApi.showTooltip({
                  label: tooltipLabel(tooltipKind, p),
                  valueText: "",
                  clientX: ev.clientX,
                  clientY: ev.clientY,
                })
              }
              onPointerMove={(ev) =>
                p.value != null &&
                tooltipApi.moveTooltip({
                  label: tooltipLabel(tooltipKind, p),
                  valueText: "",
                  clientX: ev.clientX,
                  clientY: ev.clientY,
                })
              }
              onPointerLeave={() => tooltipApi.hideTooltip()}
              onFocus={() =>
                p.value != null &&
                tooltipApi.showTooltip({
                  label: tooltipLabel(tooltipKind, p),
                  valueText: "",
                  clientX: 0,
                  clientY: 0,
                })
              }
              onBlur={() => tooltipApi.hideTooltip()}
              tabIndex={p.value != null ? 0 : -1}
            />
          );
        })}
      </Group>
    </svg>
  );
}
