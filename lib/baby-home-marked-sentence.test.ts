import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BABY_HOME_EMPHASIS_CLASS,
  babyHomeDiaperDetailMarked,
  babyHomeFeedDetailMarked,
  babyHomePumpDetailMarked,
  fillBabyHomeTemplate,
  renderBabyHomeMarkedSentence,
} from "@/lib/baby-home-marked-sentence";

describe("fillBabyHomeTemplate", () => {
  it("fills placeholders", () => {
    assert.equal(
      fillBabyHomeTemplate("About «{ml} ml»", { ml: 90 }),
      "About «90 ml»",
    );
  });
});

describe("renderBabyHomeMarkedSentence", () => {
  it("wraps «facts» in emphasis and glue in muted", () => {
    const html = renderToStaticMarkup(
      createElement("span", null, renderBabyHomeMarkedSentence("About «90 ml» each time.")),
    );
    assert.match(html, new RegExp(`<strong class="${BABY_HOME_EMPHASIS_CLASS}">90 ml</strong>`));
    assert.match(html, /text-muted/);
    assert.match(html, /About /);
    assert.match(html, / each time\./);
  });
});

describe("babyHomeFeedDetailMarked", () => {
  const tEn = (key: string) => {
    const map: Record<string, string> = {
      "home.status.detail.bottle": "a bottle of «{ml} ml»",
      "home.status.detail.breastLeft": "breast on the «left»",
      "home.status.detail.breastRight": "breast on the «right»",
      "home.status.detail.breast": "breast",
      "home.status.detail.pump": "a «pump» session",
      "home.status.detail.and": "and",
    };
    return map[key] ?? key;
  };

  it("marks formula ml from payload", () => {
    assert.equal(
      babyHomeFeedDetailMarked({
        summary: "Feed (Formula 120 ml)",
        payload: { method: "formula", amountMl: 120 },
        t: tEn,
      }),
      "a bottle of «120 ml»",
    );
  });

  it("marks breast side from payload", () => {
    assert.equal(
      babyHomeFeedDetailMarked({
        summary: "Feed (Breast L)",
        payload: { method: "breast_l" },
        t: tEn,
      }),
      "breast on the «left»",
    );
  });

  it("marks merged feed legs without pump", () => {
    assert.equal(
      babyHomeFeedDetailMarked({
        summary: "Feed (…)",
        payload: {
          legs: [
            { method: "breast_l" },
            { method: "formula", amountMl: 90 },
            { method: "pump_r" },
          ],
        },
        t: tEn,
      }),
      "breast on the «left» and a bottle of «90 ml»",
    );
  });

  it("marks merged legs", () => {
    assert.equal(
      babyHomeFeedDetailMarked({
        summary: "Feed (…)",
        payload: {
          legs: [
            { method: "breast_l" },
            { method: "formula", amountMl: 90 },
          ],
        },
        t: tEn,
      }),
      "breast on the «left» and a bottle of «90 ml»",
    );
  });
});

describe("babyHomePumpDetailMarked", () => {
  const tEn = (key: string) => {
    const map: Record<string, string> = {
      "home.status.detail.pump": "a «pump» session",
      "home.status.detail.pumpL": "pump on the «left»",
      "home.status.detail.pumpR": "pump on the «right»",
      "home.status.detail.pumpAmount": "pumped «{ml} ml»",
      "home.status.detail.and": "and",
    };
    return map[key] ?? key;
  };

  it("lists pump legs only", () => {
    assert.equal(
      babyHomePumpDetailMarked({
        summary: "Feed (…)",
        payload: {
          legs: [
            { method: "breast_l" },
            { method: "pump_r" },
            { method: "pump_l" },
          ],
        },
        t: tEn,
      }),
      "pump on the «right» and pump on the «left»",
    );
  });
});

describe("babyHomeDiaperDetailMarked", () => {
  it("marks kind from payload", () => {
    assert.equal(
      babyHomeDiaperDetailMarked({
        summary: "Diaper (Wet)",
        payload: { kind: "wet" },
        t: (key) =>
          key === "home.status.detail.diaperWet" ? "«wet»" : key,
      }),
      "«wet»",
    );
  });
});
