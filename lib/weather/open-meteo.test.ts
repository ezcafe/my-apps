import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearWeatherCacheForTests,
  fetchCurrentWeather,
  geocodeCity,
  searchCities,
  weatherCodeLabel,
} from "@/lib/weather/open-meteo";

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

  it("parses forecast API responses and caches by coordinates", async () => {
    clearWeatherCacheForTests();
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response(
        JSON.stringify({
          current: {
            temperature_2m: 31.2,
            weather_code: 2,
          },
        }),
        { status: 200 },
      );
    };

    try {
      const first = await fetchCurrentWeather(10.82, 106.63, "Ho Chi Minh City");
      const second = await fetchCurrentWeather(10.82, 106.63, "Ho Chi Minh City");
      assert.ok(first);
      assert.equal(first?.tempC, 31.2);
      assert.equal(first?.label, "Partly cloudy");
      assert.deepEqual(second, first);
      assert.equal(calls, 1);
    } finally {
      globalThis.fetch = originalFetch;
      clearWeatherCacheForTests();
    }
  });
});
