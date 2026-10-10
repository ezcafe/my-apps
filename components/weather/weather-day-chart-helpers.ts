export const WEATHER_HOUR_TICKS = [0, 6, 12, 18, 23] as const;

export function formatWeatherHourTick(hour: number): string {
  return String(hour).padStart(2, "0");
}

/** Compact Y-axis tick for weather day charts. */
export function formatWeatherYTick(
  value: number,
  kind: "temp" | "pm25" | "rain",
): string {
  if (!Number.isFinite(value)) return "";
  if (kind === "rain") return value.toFixed(1);
  return String(Math.round(value));
}

export function weatherDayXDomain(): number[] {
  return Array.from({ length: 24 }, (_, i) => i);
}

export function weatherDayYDomain(values: Array<number | null>): [number, number] {
  const finite = values.filter(
    (v): v is number => v != null && Number.isFinite(v),
  );
  if (finite.length === 0) return [0, 1];
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (min === max) {
    if (min === 0) return [0, 1];
    return [min - 1, max + 1];
  }
  return [min, max];
}

export function isWeatherChartEmpty(values: Array<number | null>): boolean {
  return !values.some((v) => v != null && Number.isFinite(v));
}

/** LinePath `defined` predicate — null/non-finite hours are gaps, not 0. */
export function isWeatherLineValueDefined(value: number | null): boolean {
  return value != null && Number.isFinite(value);
}

export function weatherDayLineAriaSummary(
  label: string,
  values: Array<number | null>,
  unit: string,
): string {
  const finite = values.filter(
    (v): v is number => v != null && Number.isFinite(v),
  );
  if (finite.length === 0) return `${label}, no data`;
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  return `${label}, range ${min} to ${max} ${unit}`;
}

export function formatWeatherTempTooltip(hour: number, value: number): string {
  const hh = formatWeatherHourTick(hour);
  return `${hh}:00 · ${Math.round(value)}°C`;
}

export function formatWeatherPm25Tooltip(hour: number, value: number): string {
  const hh = formatWeatherHourTick(hour);
  return `${hh}:00 · ${Math.round(value)} µg/m³`;
}

export function formatWeatherRainTooltip(
  hour: number,
  mm: number,
  probPct: number | null,
): string {
  const hh = formatWeatherHourTick(hour);
  const base = `${hh}:00 · ${mm.toFixed(1)} mm`;
  if (probPct == null || !Number.isFinite(probPct)) return base;
  return `${base} · ${Math.round(probPct)}% chance`;
}
