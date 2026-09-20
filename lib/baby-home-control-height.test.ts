import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BabyBottleMlChips } from "@/components/baby-bottle-ml-chips";
import { BabyCustomTimeChip } from "@/components/baby-custom-time-chip";
import { BabyDiaperKindControl } from "@/components/baby-diaper-kind-control";
import { BabyHomeSkeleton } from "@/components/baby-page-skeleton";
import { BabyQuickSimpleCard } from "@/components/baby-quick-value-card";
import {
  BABY_HOME_BIG_CONTROL_MIN_H,
  BABY_HOME_SMALL_GRID_MIN_H,
} from "@/lib/baby-home-control-height";

const HEIGHT_FLOOR =
  "h-[calc(2*2.75rem+3px)] min-h-[calc(2*2.75rem+3px)]";
const OLD_HEIGHT_FLOOR = /min-h-\[calc\(2\*2\.75rem\+1px\)\]/;

describe("baby home control height token", () => {
  it("encodes fixed 2×tile + 3×border (h + min-h 2*2.75rem+3px)", () => {
    assert.equal(BABY_HOME_BIG_CONTROL_MIN_H, HEIGHT_FLOOR);
    assert.equal(BABY_HOME_SMALL_GRID_MIN_H, BABY_HOME_BIG_CONTROL_MIN_H);
    assert.match(BABY_HOME_BIG_CONTROL_MIN_H, /h-\[calc\(2\*2\.75rem\+3px\)\]/);
    assert.match(BABY_HOME_BIG_CONTROL_MIN_H, /min-h-\[calc\(2\*2\.75rem\+3px\)\]/);
    assert.doesNotMatch(BABY_HOME_BIG_CONTROL_MIN_H, /\+1px/);
  });

  it("live controls and home skeleton use fixed 2*2.75rem+3px height (not old +1px)", () => {
    const chipT = (key: string) =>
      ({
        "home.header.bottle": "Bottle",
        "home.chipMl": "{ml} ml",
        "home.formulaCustom": "Custom",
        "home.formulaCustomOpen": "Custom ml",
      })[key] ?? key;
    const diaperT = (key: string) =>
      ({
        "home.diaper": "Diaper",
        "home.diaperTileWet": "Wet",
        "home.diaperTilePoop": "Poop",
        "home.diaperTileMixed": "Mixed",
        "home.diaperTileDry": "Dry",
        "diaper.wet": "Wet",
        "diaper.dirty": "Poop Only",
        "diaper.mixed": "Mixed",
        "diaper.dry": "Dry",
      })[key] ?? key;

    const chips = renderToStaticMarkup(
      createElement(BabyBottleMlChips, {
        mls: [90, 60, 70],
        selectedMl: null,
        onSelectMl: () => {},
        onCustom: () => {},
        t: chipT,
      }),
    );
    const simple = renderToStaticMarkup(
      createElement(BabyQuickSimpleCard, {
        labelId: "breast-l",
        label: "Left",
        valueText: "Tap to start",
        onPress: () => {},
      }),
    );
    const diaper = renderToStaticMarkup(
      createElement(BabyDiaperKindControl, {
        t: diaperT,
        onPlan: () => {},
      }),
    );
    const customTime = renderToStaticMarkup(
      createElement(BabyCustomTimeChip, {
        label: "Custom",
        valueText: "Set time",
        onPress: () => {},
      }),
    );
    const skeleton = renderToStaticMarkup(createElement(BabyHomeSkeleton));

    for (const [label, html] of [
      ["bottle chips", chips],
      ["simple card", simple],
      ["diaper grid", diaper],
      ["custom time chip", customTime],
      ["home skeleton", skeleton],
    ] as const) {
      assert.match(html, /h-\[calc\(2\*2\.75rem\+3px\)\]/, label);
      assert.match(html, /min-h-\[calc\(2\*2\.75rem\+3px\)\]/, label);
      assert.doesNotMatch(html, OLD_HEIGHT_FLOOR, label);
    }

    // Diaper/Nap Custom sibling must use the Nap-sized big-control token.
    assert.equal(
      BABY_HOME_BIG_CONTROL_MIN_H,
      HEIGHT_FLOOR,
      "token must stay Nap-sized floor",
    );
    assert.match(customTime, /h-\[calc\(2\*2\.75rem\+3px\)\]/);
    assert.match(customTime, /min-h-\[calc\(2\*2\.75rem\+3px\)\]/);
  });
});
