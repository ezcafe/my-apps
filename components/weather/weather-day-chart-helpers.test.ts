import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatWeatherHourTick,
  formatWeatherYTick,
  isWeatherChartEmpty,
  isWeatherLineValueDefined,
  weatherDayLineAriaSummary,
  weatherDayYDomain,
  WEATHER_HOUR_TICKS,
} from "@/components/weather/weather-day-chart-helpers";

describe("weather-day-chart-helpers", () => {
  it("lists standard hour ticks", () => {
    assert.deepEqual(WEATHER_HOUR_TICKS, [0, 6, 12, 18, 23]);
    assert.equal(formatWeatherHourTick(6), "06");
  });

  it("formats y-axis ticks by series kind", () => {
    assert.equal(formatWeatherYTick(26.4, "temp"), "26");
    assert.equal(formatWeatherYTick(21.6, "pm25"), "22");
    assert.equal(formatWeatherYTick(1.25, "rain"), "1.3");
  });

  it("builds y domain skipping nulls", () => {
    assert.deepEqual(weatherDayYDomain([10, null, 20]), [10, 20]);
    assert.deepEqual(weatherDayYDomain([null, null]), [0, 1]);
  });

  it("keeps flat zero rain from collapsing", () => {
    assert.deepEqual(weatherDayYDomain([0, 0, 0]), [0, 1]);
  });

  it("detects all-null series", () => {
    assert.equal(isWeatherChartEmpty([null, null]), true);
    assert.equal(isWeatherChartEmpty([0]), false);
  });

  it("treats null and non-finite as line gaps", () => {
    assert.equal(isWeatherLineValueDefined(0), true);
    assert.equal(isWeatherLineValueDefined(21.5), true);
    assert.equal(isWeatherLineValueDefined(null), false);
    assert.equal(isWeatherLineValueDefined(Number.NaN), false);
  });

  it("builds aria summary with min and max", () => {
    assert.equal(
      weatherDayLineAriaSummary("Temperature today", [24, 32, null], "°C"),
      "Temperature today, range 24 to 32 °C",
    );
  });
});
