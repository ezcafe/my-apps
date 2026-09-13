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
        doneText: "Logged",
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
    assert.match(html, /Logged/);
  });
});
