import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildWeatherDay,
  formatPm25Line,
  formatWeatherDayMeta,
  hourFromLocalTime,
} from "@/lib/weather/weather-day";

function forecastFixture(overrides: Record<string, unknown> = {}) {
  const hours = Array.from({ length: 24 }, (_, h) => {
    const hh = String(h).padStart(2, "0");
    return `2026-10-10T${hh}:00`;
  });
  return {
    current: {
      time: "2026-10-10T15:00",
      temperature_2m: 31.2,
    },
    hourly: {
      time: hours,
      temperature_2m: hours.map((_, i) => 24 + i * 0.3),
      precipitation: hours.map(() => 0.1),
      precipitation_probability: hours.map(() => 40),
    },
    ...overrides,
  };
}

function aqFixture(overrides: Record<string, unknown> = {}) {
  const hours = Array.from({ length: 24 }, (_, h) => {
    const hh = String(h).padStart(2, "0");
    return `2026-10-10T${hh}:00`;
  });
  return {
    current: { time: "2026-10-10T15:00", pm2_5: 21.3 },
    hourly: {
      time: hours,
      pm2_5: hours.map(() => 20),
    },
    ...overrides,
  };
}

describe("weather-day helpers", () => {
  it("reads hour from local time strings without Date parsing", () => {
    assert.equal(hourFromLocalTime("2026-10-10T15:00"), 15);
    assert.equal(hourFromLocalTime("2026-10-10T23:30"), 23);
    assert.equal(hourFromLocalTime(""), null);
    assert.equal(hourFromLocalTime("2026-10-10"), null);
    assert.equal(hourFromLocalTime("2026-10-10T25:00"), null);
  });

  it("formats PM2.5 lines including zero", () => {
    assert.equal(formatPm25Line(21.3), "21 µg/m³");
    assert.equal(formatPm25Line(null), "—");
    assert.equal(formatPm25Line(0), "0 µg/m³");
    assert.equal(formatPm25Line(0.4), "0 µg/m³");
  });

  it("formats weather day meta in UTC English", () => {
    assert.equal(
      formatWeatherDayMeta("Hanoi", "2026-10-10"),
      "Hanoi · Sat, Oct 10",
    );
  });

  it("builds 24 rows with merge, nowIndex, and rain total", () => {
    const day = buildWeatherDay(forecastFixture(), aqFixture(), "Hanoi");
    assert.ok(day);
    assert.equal(day!.hours.length, 24);
    assert.equal(day!.nowIndex, 15);
    assert.equal(day!.current.tempC, 31.2);
    assert.equal(day!.current.pm25, 21);
    assert.equal(day!.aqAvailable, true);
    assert.equal(day!.rainTotalMm, 2.4);
    assert.equal(day!.hours[15]?.pm25, 20);
  });

  it("leaves pm25 null when AQ misses a time row", () => {
    const aq = aqFixture();
    aq.hourly.time = aq.hourly.time.filter((t) => !t.endsWith("T12:00"));
    const day = buildWeatherDay(forecastFixture(), aq, "City");
    assert.equal(day!.hours.find((h) => h.hour === 12)?.pm25, null);
  });

  it("keeps hourly null as null", () => {
    const forecast = forecastFixture();
    forecast.hourly.temperature_2m[5] = null;
    const day = buildWeatherDay(forecast, aqFixture(), "City");
    assert.equal(day!.hours[5]?.tempC, null);
  });

  it("marks aq unavailable when aq is null", () => {
    const day = buildWeatherDay(forecastFixture(), null, "City");
    assert.equal(day!.aqAvailable, false);
    assert.ok(day!.hours.every((h) => h.pm25 === null));
  });

  it("sums rain and handles all-zero rain", () => {
    const forecast = forecastFixture();
    forecast.hourly.precipitation = forecast.hourly.time.map(() => 0);
    const day = buildWeatherDay(forecast, aqFixture(), "City");
    assert.equal(day!.rainTotalMm, 0);
  });

  it("uses nowIndex 23 for late-day current time", () => {
    const forecast = forecastFixture({
      current: { time: "2026-10-10T23:00", temperature_2m: 22 },
    });
    const day = buildWeatherDay(forecast, aqFixture(), "City");
    assert.equal(day!.nowIndex, 23);
  });

  it("treats zero PM2.5 and zero or negative temp as real numbers", () => {
    const forecast = forecastFixture({
      current: { time: "2026-10-10T10:00", temperature_2m: 0 },
    });
    forecast.hourly.temperature_2m[0] = -3.6;
    forecast.hourly.temperature_2m[10] = 0;
    const aq = aqFixture({ current: { time: "2026-10-10T10:00", pm2_5: 0 } });
    const day = buildWeatherDay(forecast, aq, "City");
    assert.equal(day!.current.pm25, 0);
    assert.equal(day!.hours[0]?.tempC, -3.6);
    assert.equal(day!.hours[10]?.tempC, 0);
  });

  it("returns null when forecast lacks usable hours", () => {
    const forecast = forecastFixture({ hourly: { time: [] } });
    assert.equal(buildWeatherDay(forecast, aqFixture(), "City"), null);
  });
});
