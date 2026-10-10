import {
  buildWeatherDay,
  type WeatherDay,
} from "@/lib/weather/weather-day";

/** WMO weather interpretation codes → plain labels. */
export function weatherCodeLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95 && code <= 99) return "Thunderstorm";
  return "Unknown";
}

export type GeocodeResult = {
  lat: number;
  lon: number;
  label: string;
};

export type CitySearchResult = {
  id: string;
  name: string;
  label: string;
  lat: number;
  lon: number;
};

export type WeatherSnapshot = {
  tempC: number;
  weatherCode: number;
  label: string;
  locationLabel: string;
  pm25: number | null;
};

type GeocodeApiResponse = {
  results?: Array<{
    latitude: number;
    longitude: number;
    name: string;
    admin1?: string;
    country?: string;
  }>;
};

type ForecastApiResponse = {
  current?: {
    time?: string;
    temperature_2m?: number;
    weather_code?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: (number | null)[];
    precipitation?: (number | null)[];
    precipitation_probability?: (number | null)[];
  };
};

type AqApiResponse = {
  current?: {
    time?: string;
    pm2_5?: number;
  };
  hourly?: {
    time?: string[];
    pm2_5?: (number | null)[];
  };
};

const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000;
const snapshotCache = new Map<
  string,
  { expiresAt: number; snapshot: WeatherSnapshot }
>();
const dayCache = new Map<string, { expiresAt: number; day: WeatherDay }>();

function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

function formatGeocodeLabel(hit: {
  name: string;
  admin1?: string;
  country?: string;
}): string {
  return [hit.name, hit.admin1, hit.country].filter(Boolean).join(", ");
}

function citySearchId(hit: {
  name: string;
  latitude: number;
  longitude: number;
}): string {
  return `${hit.name}|${hit.latitude}|${hit.longitude}`;
}

function isForecastHost(url: string): boolean {
  return url.includes("api.open-meteo.com/v1/forecast");
}

function isAqHost(url: string): boolean {
  return url.includes("air-quality-api.open-meteo.com/v1/air-quality");
}

function finitePm25(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.round(value);
}

async function parseJsonResponse<T>(res: Response): Promise<T | null> {
  try {
    const text = await res.text();
    if (!text.trim()) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function fetchForecastSnapshot(
  lat: number,
  lon: number,
): Promise<ForecastApiResponse | null> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", "temperature_2m,weather_code");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url, { next: { revalidate: 900 } });
  if (!res.ok) return null;
  return parseJsonResponse<ForecastApiResponse>(res);
}

async function fetchAqCurrent(lat: number, lon: number): Promise<AqApiResponse | null> {
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", "pm2_5");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url, { next: { revalidate: 900 } });
  if (!res.ok) return null;
  return parseJsonResponse<AqApiResponse>(res);
}

async function fetchForecastDay(
  lat: number,
  lon: number,
): Promise<ForecastApiResponse | null> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", "temperature_2m,weather_code");
  url.searchParams.set(
    "hourly",
    "temperature_2m,precipitation,precipitation_probability",
  );
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url, { next: { revalidate: 900 } });
  if (!res.ok) return null;
  return parseJsonResponse<ForecastApiResponse>(res);
}

async function fetchAqDay(lat: number, lon: number): Promise<AqApiResponse | null> {
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", "pm2_5");
  url.searchParams.set("hourly", "pm2_5");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url, { next: { revalidate: 900 } });
  if (!res.ok) return null;
  return parseJsonResponse<AqApiResponse>(res);
}

export async function searchCities(
  name: string,
  count = 8,
): Promise<CitySearchResult[]> {
  const trimmed = name.trim();
  if (trimmed.length < 2) return [];

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", trimmed);
  url.searchParams.set("count", String(Math.min(Math.max(count, 1), 20)));
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return [];

  let data: GeocodeApiResponse;
  try {
    const text = await res.text();
    if (!text.trim()) return [];
    data = JSON.parse(text) as GeocodeApiResponse;
  } catch {
    return [];
  }
  return (data.results ?? []).map((hit) => ({
    id: citySearchId(hit),
    name: hit.name,
    label: formatGeocodeLabel(hit),
    lat: hit.latitude,
    lon: hit.longitude,
  }));
}

export async function geocodeCity(name: string): Promise<GeocodeResult | null> {
  const results = await searchCities(name, 1);
  const hit = results[0];
  if (!hit) return null;

  return {
    lat: hit.lat,
    lon: hit.lon,
    label: hit.label,
  };
}

export async function fetchCurrentWeather(
  lat: number,
  lon: number,
  locationLabel: string,
): Promise<WeatherSnapshot | null> {
  const key = cacheKey(lat, lon);
  const cached = snapshotCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.snapshot;
  }

  const [forecastResult, aqResult] = await Promise.allSettled([
    fetchForecastSnapshot(lat, lon),
    fetchAqCurrent(lat, lon),
  ]);

  const forecast =
    forecastResult.status === "fulfilled" ? forecastResult.value : null;
  if (!forecast) return null;

  const tempC = forecast.current?.temperature_2m;
  const weatherCode = forecast.current?.weather_code;
  if (tempC == null || weatherCode == null || !Number.isFinite(tempC)) {
    return null;
  }

  let pm25: number | null = null;
  if (aqResult.status === "fulfilled" && aqResult.value) {
    pm25 = finitePm25(aqResult.value.current?.pm2_5);
  }
  // Fail-soft: empty/unusable AQ JSON → pm25 null and do not cache (grill Q5).
  const aqOk = pm25 != null;

  const snapshot: WeatherSnapshot = {
    tempC,
    weatherCode,
    label: weatherCodeLabel(weatherCode),
    locationLabel,
    pm25,
  };

  if (aqOk) {
    snapshotCache.set(key, {
      expiresAt: Date.now() + WEATHER_CACHE_TTL_MS,
      snapshot,
    });
  }

  return snapshot;
}

export async function fetchWeatherDay(
  lat: number,
  lon: number,
  label: string,
): Promise<WeatherDay | null> {
  const key = cacheKey(lat, lon);
  const cached = dayCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.day;
  }

  const [forecastResult, aqResult] = await Promise.allSettled([
    fetchForecastDay(lat, lon),
    fetchAqDay(lat, lon),
  ]);

  const forecast =
    forecastResult.status === "fulfilled" ? forecastResult.value : null;
  if (!forecast) return null;

  const aqJson =
    aqResult.status === "fulfilled" ? aqResult.value : null;

  const day = buildWeatherDay(forecast, aqJson, label);
  if (!day) return null;

  if (day.aqAvailable) {
    dayCache.set(key, {
      expiresAt: Date.now() + WEATHER_CACHE_TTL_MS,
      day,
    });
  }

  return day;
}

/** Test helper — clears in-memory weather cache. */
export function clearWeatherCacheForTests(): void {
  snapshotCache.clear();
  dayCache.clear();
}

/** Test helpers — host detection for URL-routed fakes. */
export const __weatherFetchHostsForTests = {
  isForecastHost,
  isAqHost,
};
