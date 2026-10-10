import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WeatherDayView } from "@/components/weather/weather-day-view";
import type { WeatherDay } from "@/lib/weather/weather-day";

function baseDay(overrides: Partial<WeatherDay> = {}): WeatherDay {
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    time: `2026-10-10T${String(hour).padStart(2, "0")}:00`,
    hour,
    tempC: 25,
    pm25: 10,
    rainMm: 0,
    rainProbPct: 0,
  }));
  return {
    date: "2026-10-10",
    label: "City",
    nowIndex: 12,
    current: { tempC: 30, pm25: 12 },
    aqAvailable: true,
    rainTotalMm: 0,
    hours,
    ...overrides,
  };
}

describe("WeatherDayView", () => {
  it("renders cards in Temperature → PM2.5 → Rain order", () => {
    const html = renderToStaticMarkup(
      createElement(WeatherDayView, { day: baseDay() }),
    );
    const temp = html.indexOf("Temperature");
    const pm = html.indexOf("PM2.5");
    const rain = html.indexOf("Rain");
    assert.ok(temp >= 0 && pm > temp && rain > pm);
  });

  it("shows AQ unavailable copy while keeping temp and rain cards", () => {
    const html = renderToStaticMarkup(
      createElement(WeatherDayView, {
        day: baseDay({ aqAvailable: false, current: { tempC: 30, pm25: null } }),
      }),
    );
    assert.match(html, /Air quality is temporarily unavailable/);
    assert.match(html, /Temperature/);
    assert.match(html, /Rain/);
    assert.match(html, /30°C/);
  });

  it("shows zero rain total headline when all hours are zero", () => {
    const html = renderToStaticMarkup(
      createElement(WeatherDayView, { day: baseDay({ rainTotalMm: 0 }) }),
    );
    assert.match(html, /0\.0 mm/);
  });

  it("uses text-muted on KPI card labels", () => {
    const html = renderToStaticMarkup(
      createElement(WeatherDayView, { day: baseDay() }),
    );
    assert.match(
      html,
      /text-sm font-medium text-muted[^"]*">Temperature</,
    );
    assert.match(html, /text-sm font-medium text-muted[^"]*">PM2\.5</);
    assert.match(html, /text-sm font-medium text-muted[^"]*">Rain</);
  });
});
