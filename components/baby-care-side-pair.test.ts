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
  });
});
