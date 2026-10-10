import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { KioskContextStrip } from "@/components/kiosk/kiosk-context-strip";
import { PreferencesProvider } from "@/components/preferences-provider";

function renderStrip(props: ComponentProps<typeof KioskContextStrip>) {
  return renderToStaticMarkup(
    createElement(
      PreferencesProvider,
      { initialDateFormat: "ymd" },
      createElement(KioskContextStrip, props),
    ),
  );
}

describe("KioskContextStrip weather block", () => {
  it("links to weather day with PM2.5 value and no city line", () => {
    const html = renderStrip({
        weather: {
          tempC: 31,
          weatherCode: 2,
          label: "Partly cloudy",
          locationLabel: "Hanoi",
          pm25: 21,
        },
        weatherCity: "Hanoi",
      });
    assert.match(html, /href="\/kiosk\/weather"/);
    assert.match(html, /21 µg\/m³/);
    assert.doesNotMatch(html, />PM2\.5</);
    assert.doesNotMatch(html, />Hanoi</);
    assert.match(html, /aria-label="[^"]*PM2\.5 21 µg\/m³"/);
    assert.equal((html.match(/<a /g) ?? []).length, 1);
  });

  it("orders temp then pm25 then condition", () => {
    const html = renderStrip({
      weather: {
        tempC: 26,
        weatherCode: 3,
        label: "Overcast",
        locationLabel: "Hanoi",
        pm25: 21,
      },
      weatherCity: "Hanoi",
    });
    // Ignore aria-label (also mentions PM2.5); lock visible paragraph order.
    assert.match(
      html,
      /26°C[\s\S]*?>21 µg\/m³<[\s\S]*?>Overcast</,
    );
  });

  it("shows dash when pm25 is null", () => {
    const html = renderStrip({
      weather: {
        tempC: 28,
        weatherCode: 0,
        label: "Clear",
        locationLabel: "City",
        pm25: null,
      },
      weatherCity: "City",
    });
    assert.match(html, /—/);
    assert.match(html, /href="\/kiosk\/weather"/);
  });

  it("keeps Settings link without weather link when no city", () => {
    const html = renderStrip({
      weather: null,
      weatherCity: null,
    });
    assert.match(html, /settings#settings-kiosk/);
    assert.doesNotMatch(html, /\/kiosk\/weather/);
    assert.equal((html.match(/<a /g) ?? []).length, 1);
  });

  it("shows unavailable copy with no links when city set but fetch failed", () => {
    const html = renderStrip({
      weather: null,
      weatherCity: "Hanoi",
    });
    assert.match(html, /temporarily unavailable/i);
    assert.doesNotMatch(html, /<a /);
  });
});
