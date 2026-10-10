import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  __weatherFetchHostsForTests,
  clearWeatherCacheForTests,
  fetchCurrentWeather,
  fetchWeatherDay,
  geocodeCity,
  searchCities,
  weatherCodeLabel,
} from "@/lib/weather/open-meteo";

const { isForecastHost, isAqHost } = __weatherFetchHostsForTests;

function hourTimes() {
  return Array.from({ length: 24 }, (_, h) => {
    const hh = String(h).padStart(2, "0");
    return `2026-10-10T${hh}:00`;
  });
}

function forecastSnapshotBody() {
  return {
    current: { temperature_2m: 31.2, weather_code: 2 },
  };
}

function forecastDayBody() {
  const times = hourTimes();
  return {
    current: { time: "2026-10-10T15:00", temperature_2m: 31.2, weather_code: 2 },
    hourly: {
      time: times,
      temperature_2m: times.map((_, i) => 20 + i),
      precipitation: times.map(() => 0.1),
      precipitation_probability: times.map(() => 30),
    },
  };
}

function aqBody(pm25 = 21.3) {
  const times = hourTimes();
  return {
    current: { time: "2026-10-10T15:00", pm2_5: pm25 },
    hourly: { time: times, pm2_5: times.map(() => pm25) },
  };
}

function routedFetch(handlers: {
  forecast?: () => Response | Promise<Response>;
  aq?: () => Response | Promise<Response>;
}) {
  return async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (isForecastHost(url)) {
      const fn = handlers.forecast;
      if (!fn) return new Response("missing forecast", { status: 500 });
      return fn();
    }
    if (isAqHost(url)) {
      const fn = handlers.aq;
      if (!fn) return new Response("missing aq", { status: 500 });
      return fn();
    }
    return new Response(JSON.stringify({ results: [] }), { status: 200 });
  };
}

describe("open-meteo weather", () => {
  it("maps WMO weather codes to plain labels", () => {
    assert.equal(weatherCodeLabel(0), "Clear");
    assert.equal(weatherCodeLabel(3), "Overcast");
    assert.equal(weatherCodeLabel(61), "Rain");
    assert.equal(weatherCodeLabel(999), "Unknown");
  });

  it("returns multiple city matches for search", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          results: [
            {
              latitude: 10.82,
              longitude: 106.63,
              name: "Ho Chi Minh City",
              admin1: "Ho Chi Minh",
              country: "Vietnam",
            },
            {
              latitude: 21.0285,
              longitude: 105.8542,
              name: "Hanoi",
              admin1: "Hanoi",
              country: "Vietnam",
            },
          ],
        }),
        { status: 200 },
      );

    try {
      const results = await searchCities("vietnam", 8);
      assert.equal(results.length, 2);
      assert.equal(results[0]?.name, "Ho Chi Minh City");
      assert.match(results[0]?.label ?? "", /Vietnam/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns empty list for short queries", async () => {
    const results = await searchCities("a");
    assert.deepEqual(results, []);
  });

  it("parses geocode API responses", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          results: [
            {
              latitude: 10.82,
              longitude: 106.63,
              name: "Ho Chi Minh City",
              admin1: "Ho Chi Minh",
              country: "Vietnam",
            },
          ],
        }),
        { status: 200 },
      );

    try {
      const result = await geocodeCity("Ho Chi Minh City");
      assert.ok(result);
      assert.equal(result?.lat, 10.82);
      assert.equal(result?.lon, 106.63);
      assert.match(result?.label ?? "", /Ho Chi Minh City/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns null when geocode finds no city", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ results: [] }), { status: 200 });

    try {
      const result = await geocodeCity("NoSuchPlaceXYZ123");
      assert.equal(result, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses snapshot with pm25 and caches when AQ succeeds", async () => {
    clearWeatherCacheForTests();
    const originalFetch = globalThis.fetch;
    let aqCalls = 0;
    globalThis.fetch = routedFetch({
      forecast: () =>
        new Response(JSON.stringify(forecastSnapshotBody()), { status: 200 }),
      aq: () => {
        aqCalls += 1;
        return new Response(JSON.stringify(aqBody(21.3)), { status: 200 });
      },
    });

    try {
      const first = await fetchCurrentWeather(10.82, 106.63, "Ho Chi Minh City");
      const second = await fetchCurrentWeather(10.82, 106.63, "Ho Chi Minh City");
      assert.ok(first);
      assert.equal(first?.tempC, 31.2);
      assert.equal(first?.label, "Partly cloudy");
      assert.equal(first?.pm25, 21);
      assert.deepEqual(second, first);
      assert.equal(aqCalls, 1);
    } finally {
      globalThis.fetch = originalFetch;
      clearWeatherCacheForTests();
    }
  });

  it("returns pm25 null without caching when AQ fails with 500", async () => {
    clearWeatherCacheForTests();
    const originalFetch = globalThis.fetch;
    let aqCalls = 0;
    globalThis.fetch = routedFetch({
      forecast: () =>
        new Response(JSON.stringify(forecastSnapshotBody()), { status: 200 }),
      aq: () => {
        aqCalls += 1;
        return new Response("error", { status: 500 });
      },
    });

    try {
      const first = await fetchCurrentWeather(1, 2, "City");
      const second = await fetchCurrentWeather(1, 2, "City");
      assert.ok(first);
      assert.equal(first.tempC, 31.2);
      assert.equal(first.pm25, null);
      assert.equal(second?.pm25, null);
      assert.equal(aqCalls, 2);
    } finally {
      globalThis.fetch = originalFetch;
      clearWeatherCacheForTests();
    }
  });

  it("returns null when forecast fails", async () => {
    clearWeatherCacheForTests();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = routedFetch({
      forecast: () => new Response("fail", { status: 500 }),
      aq: () => new Response(JSON.stringify(aqBody()), { status: 200 }),
    });

    try {
      const result = await fetchCurrentWeather(1, 2, "City");
      assert.equal(result, null);
    } finally {
      globalThis.fetch = originalFetch;
      clearWeatherCacheForTests();
    }
  });

  it("handles AQ network throw and non-JSON without caching", async () => {
    clearWeatherCacheForTests();
    const originalFetch = globalThis.fetch;
    let aqCalls = 0;
    globalThis.fetch = routedFetch({
      forecast: () =>
        new Response(JSON.stringify(forecastSnapshotBody()), { status: 200 }),
      aq: () => {
        aqCalls += 1;
        if (aqCalls === 1) throw new Error("network");
        return new Response("oops", { status: 200 });
      },
    });

    try {
      const first = await fetchCurrentWeather(3, 4, "City");
      const second = await fetchCurrentWeather(3, 4, "City");
      assert.equal(first?.pm25, null);
      assert.equal(second?.pm25, null);
      assert.equal(aqCalls, 2);
    } finally {
      globalThis.fetch = originalFetch;
      clearWeatherCacheForTests();
    }
  });

  it("does not cache snapshot when AQ JSON is empty or missing pm2_5", async () => {
    clearWeatherCacheForTests();
    const originalFetch = globalThis.fetch;
    let aqCalls = 0;
    globalThis.fetch = routedFetch({
      forecast: () =>
        new Response(JSON.stringify(forecastSnapshotBody()), { status: 200 }),
      aq: () => {
        aqCalls += 1;
        if (aqCalls === 1) return new Response("{}", { status: 200 });
        return new Response(
          JSON.stringify({ current: { time: "2026-10-10T15:00" } }),
          { status: 200 },
        );
      },
    });

    try {
      const first = await fetchCurrentWeather(5, 6, "City");
      const second = await fetchCurrentWeather(5, 6, "City");
      assert.ok(first);
      assert.equal(first.tempC, 31.2);
      assert.equal(first.pm25, null);
      assert.ok(second);
      assert.equal(second.pm25, null);
      assert.equal(aqCalls, 2);
    } finally {
      globalThis.fetch = originalFetch;
      clearWeatherCacheForTests();
    }
  });

  it("returns null for both fetchers when forecast fails but AQ ok", async () => {
    clearWeatherCacheForTests();
    const originalFetch = globalThis.fetch;
    let forecastCalls = 0;
    globalThis.fetch = routedFetch({
      forecast: () => {
        forecastCalls += 1;
        return new Response("fail", { status: 500 });
      },
      aq: () => new Response(JSON.stringify(aqBody()), { status: 200 }),
    });

    try {
      assert.equal(await fetchCurrentWeather(5, 6, "City"), null);
      assert.equal(await fetchWeatherDay(5, 6, "City"), null);
      await fetchCurrentWeather(5, 6, "City");
      assert.equal(forecastCalls, 3);
    } finally {
      globalThis.fetch = originalFetch;
      clearWeatherCacheForTests();
    }
  });

  it("keeps snapshot and day caches separate", async () => {
    clearWeatherCacheForTests();
    const originalFetch = globalThis.fetch;
    let forecastCalls = 0;
    globalThis.fetch = routedFetch({
      forecast: () => {
        forecastCalls += 1;
        const body =
          forecastCalls === 1
            ? forecastSnapshotBody()
            : forecastDayBody();
        return new Response(JSON.stringify(body), { status: 200 });
      },
      aq: () => new Response(JSON.stringify(aqBody()), { status: 200 }),
    });

    try {
      await fetchCurrentWeather(7, 8, "City");
      const day = await fetchWeatherDay(7, 8, "City");
      assert.ok(day?.hours.length);
      assert.ok(forecastCalls >= 2);
    } finally {
      globalThis.fetch = originalFetch;
      clearWeatherCacheForTests();
    }
  });

  it("fetchWeatherDay uses timezone auto and caches when AQ ok", async () => {
    clearWeatherCacheForTests();
    const originalFetch = globalThis.fetch;
    const urls: string[] = [];
    let aqCalls = 0;
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      urls.push(url);
      if (isForecastHost(url)) {
        return new Response(JSON.stringify(forecastDayBody()), { status: 200 });
      }
      if (isAqHost(url)) {
        aqCalls += 1;
        return new Response(JSON.stringify(aqBody()), { status: 200 });
      }
      return new Response("{}", { status: 200 });
    };

    try {
      const first = await fetchWeatherDay(9, 10, "City");
      const second = await fetchWeatherDay(9, 10, "City");
      assert.ok(first);
      assert.equal(first?.aqAvailable, true);
      assert.deepEqual(second, first);
      assert.equal(aqCalls, 1);
      assert.ok(urls.some((u) => u.includes("timezone=auto")));
      assert.ok(urls.some((u) => u.includes("hourly=")));
    } finally {
      globalThis.fetch = originalFetch;
      clearWeatherCacheForTests();
    }
  });

  it("marks aq unavailable on day when AQ fails and does not cache", async () => {
    clearWeatherCacheForTests();
    const originalFetch = globalThis.fetch;
    let aqCalls = 0;
    globalThis.fetch = routedFetch({
      forecast: () =>
        new Response(JSON.stringify(forecastDayBody()), { status: 200 }),
      aq: () => {
        aqCalls += 1;
        return new Response("fail", { status: 500 });
      },
    });

    try {
      const first = await fetchWeatherDay(11, 12, "City");
      const second = await fetchWeatherDay(11, 12, "City");
      assert.ok(first);
      assert.equal(first.aqAvailable, false);
      assert.equal(first.hours.length, 24);
      assert.ok(first.hours.every((h) => h.pm25 === null));
      assert.equal(second?.aqAvailable, false);
      assert.equal(aqCalls, 2);
    } finally {
      globalThis.fetch = originalFetch;
      clearWeatherCacheForTests();
    }
  });

  it("fetchWeatherDay handles AQ network throw and non-JSON without caching", async () => {
    clearWeatherCacheForTests();
    const originalFetch = globalThis.fetch;
    let aqCalls = 0;
    globalThis.fetch = routedFetch({
      forecast: () =>
        new Response(JSON.stringify(forecastDayBody()), { status: 200 }),
      aq: () => {
        aqCalls += 1;
        if (aqCalls === 1) throw new Error("network");
        return new Response("oops", { status: 200 });
      },
    });

    try {
      const first = await fetchWeatherDay(13, 14, "City");
      const second = await fetchWeatherDay(13, 14, "City");
      assert.ok(first);
      assert.equal(first.aqAvailable, false);
      assert.ok(first.hours.length > 0);
      assert.ok(first.hours.every((h) => h.pm25 === null));
      assert.ok(second);
      assert.equal(second.aqAvailable, false);
      assert.equal(aqCalls, 2);
    } finally {
      globalThis.fetch = originalFetch;
      clearWeatherCacheForTests();
    }
  });
});
