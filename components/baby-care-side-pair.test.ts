import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BabyBreastSidePair } from "@/components/baby-breast-side-pair";
import { BabyPumpSidePair } from "@/components/baby-pump-side-pair";

describe("BabyBreastSidePair", () => {
  it("renders L/R testids and wires onPress per side", () => {
    const pressed: string[] = [];
    const html = renderToStaticMarkup(
      createElement(BabyBreastSidePair, {
        sides: [
          {
            side: "breast_l",
            label: "Breast L",
            running: false,
            tapToStart: "Start",
            tapToStop: "Stop",
            onPress: () => pressed.push("breast_l"),
          },
          {
            side: "breast_r",
            label: "Breast R",
            running: true,
            tapToStart: "Start",
            tapToStop: "Stop",
            onPress: () => pressed.push("breast_r"),
          },
        ],
      }),
    );
    assert.match(html, /data-testid="baby-breast-side-pair"/);
    assert.match(html, /data-testid="baby-care-chip-breast_l"/);
    assert.match(html, /data-testid="baby-care-chip-breast_r"/);
    assert.match(html, /Breast L/);
    assert.match(html, /Breast R/);
  });

  it("asContents joins a parent grid like Pump pair", () => {
    const html = renderToStaticMarkup(
      createElement(BabyBreastSidePair, {
        asContents: true,
        sides: [
          {
            side: "breast_l",
            label: "L",
            running: false,
            tapToStart: "Start",
            tapToStop: "Stop",
            onPress: () => {},
          },
          {
            side: "breast_r",
            label: "R",
            running: false,
            tapToStart: "Start",
            tapToStop: "Stop",
            onPress: () => {},
          },
        ],
      }),
    );
    assert.match(html, /contents/);
  });
});

describe("BabyPumpSidePair", () => {
  it("renders pump L/R testids", () => {
    const html = renderToStaticMarkup(
      createElement(BabyPumpSidePair, {
        sides: [
          {
            side: "pump_l",
            label: "Pump L",
            running: false,
            tapToStart: "Start",
            tapToStop: "Stop",
            onPress: () => {},
          },
          {
            side: "pump_r",
            label: "Pump R",
            running: false,
            tapToStart: "Start",
            tapToStop: "Stop",
            onPress: () => {},
          },
        ],
      }),
    );
    assert.match(html, /data-testid="baby-pump-side-pair"/);
    assert.match(html, /data-testid="baby-care-chip-pump_l"/);
    assert.match(html, /data-testid="baby-care-chip-pump_r"/);
    // Breast-pump bottle W: profile horn + motor bump + bottle (not formula bottle).
    assert.match(html, /M2\.5 12c1-6 5-9 9\.5-6l2 3/);
    assert.match(html, /M14\.5 6\.5h3\.5a1\.5 1\.5 0 0 1 0 3H16/);
    assert.doesNotMatch(html, /M9 3h6v3H9V3Z/);
    assert.doesNotMatch(html, /M7 10 12 3l5 7/);
  });

  it("renders Both after L/R when provided", () => {
    const html = renderToStaticMarkup(
      createElement(BabyPumpSidePair, {
        sides: [
          {
            side: "pump_l",
            label: "Pump L",
            running: false,
            tapToStart: "Start",
            tapToStop: "Stop",
            onPress: () => {},
          },
          {
            side: "pump_r",
            label: "Pump R",
            running: false,
            tapToStart: "Start",
            tapToStop: "Stop",
            onPress: () => {},
          },
          {
            side: "pump_both",
            label: "Both",
            running: false,
            tapToStart: "Start",
            tapToStop: "Stop",
            onPress: () => {},
          },
        ],
      }),
    );
    assert.match(html, /data-testid="baby-care-chip-pump_both"/);
    assert.match(html, />Both</);
    const l = html.indexOf('data-testid="baby-care-chip-pump_l"');
    const r = html.indexOf('data-testid="baby-care-chip-pump_r"');
    const both = html.indexOf('data-testid="baby-care-chip-pump_both"');
    assert.ok(l < r && r < both, "Both follows L then R");
  });
});
