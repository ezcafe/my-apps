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
    temperature_2m?: number;
    weather_code?: number;
  };
};

const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000;
const weatherCache = new Map<
  string,
  { expiresAt: number; snapshot: WeatherSnapshot }
>();

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

  const data = (await res.json()) as GeocodeApiResponse;
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
  const cached = weatherCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.snapshot;
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", "temperature_2m,weather_code");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url, { next: { revalidate: 900 } });
  if (!res.ok) return null;

  const data = (await res.json()) as ForecastApiResponse;
  const tempC = data.current?.temperature_2m;
  const weatherCode = data.current?.weather_code;
  if (tempC == null || weatherCode == null) return null;

  const snapshot: WeatherSnapshot = {
    tempC,
    weatherCode,
    label: weatherCodeLabel(weatherCode),
    locationLabel,
  };

  weatherCache.set(key, {
    expiresAt: Date.now() + WEATHER_CACHE_TTL_MS,
    snapshot,
  });

  return snapshot;
}

/** Test helper — clears in-memory weather cache. */
export function clearWeatherCacheForTests(): void {
  weatherCache.clear();
}
