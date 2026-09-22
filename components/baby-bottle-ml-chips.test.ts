import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BabyBottleMlChips } from "@/components/baby-bottle-ml-chips";

describe("BabyBottleMlChips", () => {
  it("renders up to 3 ml chips + Custom with Kind flush language", () => {
    const html = renderToStaticMarkup(
      createElement(BabyBottleMlChips, {
        mls: [90, 60, 70],
        selectedMl: null,
        onSelectMl: () => {},
        onCustom: () => {},
        t: (key) =>
          ({
            "home.header.bottle": "Bottle",
            "home.chipMl": "{ml} ml",
            "home.formulaCustom": "Custom",
            "home.formulaCustomOpen": "Custom ml",
          })[key] ?? key,
      }),
    );
    assert.match(html, /data-layout="bottle-ml-chips"/);
    assert.match(html, /data-bottle-ml="90"/);
    assert.match(html, /data-bottle-ml="60"/);
    assert.match(html, /data-bottle-ml="70"/);
    assert.match(html, /data-bottle-ml="custom"/);
    assert.doesNotMatch(html, /data-selected/);
    assert.match(html, /fx-ripple/);
    assert.match(html, /gap-0/);
    assert.match(html, /min-h-11/);
    // Same flush 2×2 as Diaper Kind (3 ml + Custom).
    assert.match(html, /grid-cols-2/);
    assert.match(html, /grid-rows-2/);
    assert.doesNotMatch(html, /flex-wrap/);
    assert.doesNotMatch(html, /formulaMore|More ml|Less ml/);
    assert.match(html, /hover:bg-secondary-hover/);
  });

  it("keeps primary on selected ml during done flash", () => {
    const html = renderToStaticMarkup(
      createElement(BabyBottleMlChips, {
        mls: [120, 90, 60],
        selectedMl: 120,
        doneFlash: true,
        doneText: "Done",
        onSelectMl: () => {},
        onCustom: () => {},
        t: (key) =>
          ({
            "home.header.bottle": "Bottle",
            "home.chipMl": "{ml} ml",
            "home.formulaCustom": "Custom",
            "home.formulaCustomOpen": "Custom ml",
          })[key] ?? key,
      }),
    );
    assert.match(html, /data-bottle-ml="120"[^>]*data-bottle-flash="done"/);
    assert.match(html, /Done/);
    // Done face: accent-foreground only (no leftover text-foreground → white/black skew).
    const chip120 = html.match(
      /data-bottle-ml="120"[^>]*class="([^"]+)"/,
    )?.[1];
    assert.ok(chip120);
    assert.match(chip120!, /text-accent-foreground/);
    assert.doesNotMatch(chip120!, /text-foreground/);
  });

  it("Done flashes on Custom only when customSelected, not on prepended ml", () => {
    const html = renderToStaticMarkup(
      createElement(BabyBottleMlChips, {
        mls: [150, 90, 120],
        selectedMl: 150,
        doneFlash: true,
        doneText: "Done",
        customSelected: true,
        onSelectMl: () => {},
        onCustom: () => {},
        t: (key) =>
          ({
            "home.header.bottle": "Bottle",
            "home.chipMl": "{ml} ml",
            "home.formulaCustom": "Custom",
            "home.formulaCustomOpen": "Custom ml",
          })[key] ?? key,
      }),
    );
    assert.match(html, /data-bottle-ml="custom"[^>]*data-bottle-flash="done"/);
    assert.doesNotMatch(
      html,
      /data-bottle-ml="150"[^>]*data-bottle-flash="done"/,
    );
    assert.match(html, /data-face-slot="done"[^>]*>Done</);
    // Locked Done: absolute overlay + reserved idle value slot (no height jump).
    assert.match(
      html,
      /data-face-slot="done"[^>]*absolute inset-0[^>]*items-center justify-center/,
    );
    assert.match(
      html,
      /data-bottle-ml="custom"[^]*?data-face-slot="value"[^>]*invisible/,
    );
  });

  it("numeric Done keeps absolute overlay and reserved value slot", () => {
    const html = renderToStaticMarkup(
      createElement(BabyBottleMlChips, {
        mls: [120, 90, 60],
        selectedMl: 120,
        doneFlash: true,
        doneText: "Done",
        onSelectMl: () => {},
        onCustom: () => {},
        t: (key) =>
          ({
            "home.header.bottle": "Bottle",
            "home.chipMl": "{ml} ml",
            "home.formulaCustom": "Custom",
            "home.formulaCustomOpen": "Custom ml",
          })[key] ?? key,
      }),
    );
    assert.match(html, /data-bottle-ml="120"[^>]*data-bottle-flash="done"/);
    assert.match(
      html,
      /data-face-slot="done"[^>]*absolute inset-0[^>]*items-center justify-center/,
    );
    assert.match(
      html,
      /data-bottle-ml="120"[^]*?data-face-slot="value"[^>]*invisible/,
    );
  });

  it("Custom chip showDone is false when custom but not selected", () => {
    const html = renderToStaticMarkup(
      createElement(BabyBottleMlChips, {
        mls: [90, 120, 150],
        selectedMl: 90,
        doneFlash: true,
        doneText: "Done",
        customSelected: false,
        onSelectMl: () => {},
        onCustom: () => {},
        t: (key) =>
          ({
            "home.header.bottle": "Bottle",
            "home.chipMl": "{ml} ml",
            "home.formulaCustom": "Custom",
            "home.formulaCustomOpen": "Custom ml",
          })[key] ?? key,
      }),
    );
    assert.doesNotMatch(
      html,
      /data-bottle-ml="custom"[^>]*data-bottle-flash="done"/,
    );
    assert.match(html, /data-bottle-ml="90"[^>]*data-bottle-flash="done"/);
  });
});
