export type WeatherHour = {
  time: string;
  hour: number;
  tempC: number | null;
  pm25: number | null;
  rainMm: number | null;
  rainProbPct: number | null;
};

export type WeatherDay = {
  date: string;
  label: string;
  nowIndex: number;
  current: { tempC: number; pm25: number | null };
  aqAvailable: boolean;
  rainTotalMm: number;
  hours: WeatherHour[];
};

type ForecastJson = {
  current?: {
    time?: string;
    temperature_2m?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: (number | null)[];
    precipitation?: (number | null)[];
    precipitation_probability?: (number | null)[];
  };
};

type AqJson = {
  current?: {
    time?: string;
    pm2_5?: number;
  };
  hourly?: {
    time?: string[];
    pm2_5?: (number | null)[];
  };
};

function finiteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

/** Hour 0–23 from an Open-Meteo local time string (no Date parsing). */
export function hourFromLocalTime(time: string): number | null {
  if (time.length < 13) return null;
  const slice = time.slice(11, 13);
  const hour = Number.parseInt(slice, 10);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;
  return hour;
}

/** Kiosk strip line — value only (no "PM2.5" label; that lives in the aria-name). */
export function formatPm25Line(pm25: number | null): string {
  if (pm25 == null) return "—";
  return `${Math.round(pm25)} µg/m³`;
}

/** UTC-based city + date line for the weather day header meta. */
export function formatWeatherDayMeta(city: string, date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const weekday = d.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
  const monthDay = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${city} · ${weekday}, ${monthDay}`;
}

export function formatTempNow(tempC: number): string {
  return `${Math.round(tempC)}°C`;
}

export function formatPm25Now(pm25: number | null): string {
  if (pm25 == null) return "—";
  return `${Math.round(pm25)} µg/m³`;
}

export function formatRainTotal(rainTotalMm: number): string {
  return `${rainTotalMm.toFixed(1)} mm`;
}

function aqHasUsableData(aq: AqJson | null): boolean {
  if (!aq) return false;
  const cur = finiteNumber(aq.current?.pm2_5);
  const hourly = aq.hourly?.pm2_5 ?? [];
  const hourlyOk = hourly.some((v) => finiteNumber(v) != null);
  return cur != null || hourlyOk;
}

function pm25ByTime(aq: AqJson | null): Map<string, number | null> {
  const map = new Map<string, number | null>();
  if (!aq?.hourly?.time) return map;
  const times = aq.hourly.time;
  const values = aq.hourly.pm2_5 ?? [];
  for (let i = 0; i < times.length; i += 1) {
    const t = times[i];
    if (!t) continue;
    map.set(t, finiteNumber(values[i] ?? null));
  }
  return map;
}

export function buildWeatherDay(
  forecastJson: ForecastJson,
  aqJson: AqJson | null,
  label: string,
): WeatherDay | null {
  const currentTime = forecastJson.current?.time;
  const currentTemp = finiteNumber(forecastJson.current?.temperature_2m);
  if (!currentTime || currentTemp == null) return null;

  const date = currentTime.slice(0, 10);
  const times = forecastJson.hourly?.time ?? [];
  const temps = forecastJson.hourly?.temperature_2m ?? [];
  const rains = forecastJson.hourly?.precipitation ?? [];
  const rainProbs = forecastJson.hourly?.precipitation_probability ?? [];

  const dayTimes = times.filter((t) => t.startsWith(`${date}T`));
  if (dayTimes.length === 0) return null;

  const aqMap = pm25ByTime(aqJson);
  const aqAvailable = aqHasUsableData(aqJson);

  let currentPm25: number | null = null;
  if (aqJson?.current?.pm2_5 != null) {
    const rounded = finiteNumber(aqJson.current.pm2_5);
    currentPm25 = rounded == null ? null : Math.round(rounded);
  }

  const hours: WeatherHour[] = dayTimes.map((time) => {
    const idx = times.indexOf(time);
    const hour = hourFromLocalTime(time);
    const tempRaw = idx >= 0 ? finiteNumber(temps[idx] ?? null) : null;
    const rainRaw = idx >= 0 ? finiteNumber(rains[idx] ?? null) : null;
    const probRaw = idx >= 0 ? finiteNumber(rainProbs[idx] ?? null) : null;
    const pmRaw = aqMap.has(time) ? aqMap.get(time)! : null;

    return {
      time,
      hour: hour ?? 0,
      tempC: tempRaw,
      pm25: pmRaw == null ? null : Math.round(pmRaw),
      rainMm: rainRaw,
      rainProbPct: probRaw,
    };
  });

  const rainTotalMm =
    Math.round(
      hours.reduce((sum, h) => sum + (h.rainMm ?? 0), 0) * 10,
    ) / 10;

  const nowIndex = hourFromLocalTime(currentTime) ?? 0;

  return {
    date,
    label,
    nowIndex,
    current: { tempC: currentTemp, pm25: currentPm25 },
    aqAvailable,
    rainTotalMm,
    hours,
  };
}
