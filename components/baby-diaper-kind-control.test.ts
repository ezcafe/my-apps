import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BabyDiaperKindControl } from "@/components/baby-diaper-kind-control";

const t = (k: string) =>
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
  })[k] ?? k;

describe("BabyDiaperKindControl", () => {
  it("renders 2×2 Kind tiles with full aria names (not 1×4 steppers)", () => {
    const html = renderToStaticMarkup(
      createElement(BabyDiaperKindControl, {
        t,
        onPlan: () => {},
      }),
    );
    assert.match(html, /data-layout="diaper-kind-2x2"/);
    assert.match(html, /grid-cols-2/);
    assert.match(html, /gap-0/);
    assert.match(html, /fx-ripple/);
    assert.match(html, /data-diaper-kind="wet"/);
    assert.match(html, /data-diaper-kind="dirty"/);
    assert.match(html, /data-diaper-kind="mixed"/);
    assert.match(html, /data-diaper-kind="dry"/);
    assert.match(html, /aria-label="Poop Only"/);
    assert.doesNotMatch(html, /data-stepper/);
    assert.doesNotMatch(html, /data-done-kind=/);
    assert.equal((html.match(/data-diaper-kind=/g) ?? []).length, 4);
    // Idle: no default primary (Wet is not pre-selected).
    assert.doesNotMatch(html, /data-selected/);
    assert.doesNotMatch(html, /bg-accent/);
    // Kind icons for 3AM glanceability.
    assert.match(html, /data-diaper-icon="wet"/);
    assert.match(html, /data-diaper-icon="dirty"/);
    assert.match(html, /data-diaper-icon="mixed"/);
    assert.match(html, /data-diaper-icon="dry"/);
    // Icon + label share one row.
    assert.match(html, /data-diaper-kind="wet"[^>]*flex-row/);
    assert.match(html, /hover:bg-secondary-hover/);
  });

  it("shows Done on dirty/mixed tiles after sheet save flash", () => {
    const dirtyDone = renderToStaticMarkup(
      createElement(BabyDiaperKindControl, {
        t,
        doneKind: "dirty",
        doneText: "Done",
        onPlan: () => {},
      }),
    );
    assert.match(dirtyDone, /data-done-kind="dirty"/);
    assert.match(
      dirtyDone,
      /data-diaper-kind="dirty"[^>]*data-diaper-flash="done"/,
    );
    assert.match(dirtyDone, />Done</);
    assert.doesNotMatch(dirtyDone, />Poop</);
  });

  it("shows Done on doneKind tile then short labels on others (S1)", () => {
    const wetDone = renderToStaticMarkup(
      createElement(BabyDiaperKindControl, {
        t,
        doneKind: "wet",
        doneText: "Done",
        onPlan: () => {},
      }),
    );
    assert.match(wetDone, /data-done-kind="wet"/);
    assert.match(wetDone, /data-selected/);
    assert.match(wetDone, /bg-accent/);
    assert.match(
      wetDone,
      /data-diaper-kind="wet"[^>]*data-diaper-flash="done"/,
    );
    assert.match(wetDone, />Done</);
    assert.match(wetDone, />Poop</);
    assert.match(wetDone, />Mixed</);
    assert.match(wetDone, />Dry</);
    assert.doesNotMatch(wetDone, />Wet</);
    assert.doesNotMatch(
      wetDone,
      /data-diaper-kind="dirty"[^>]*data-selected/,
    );

    const dryDone = renderToStaticMarkup(
      createElement(BabyDiaperKindControl, {
        t,
        doneKind: "dry",
        doneText: "Done",
        onPlan: () => {},
      }),
    );
    assert.match(dryDone, /data-done-kind="dry"/);
    assert.match(
      dryDone,
      /data-diaper-kind="dry"[^>]*data-diaper-flash="done"/,
    );
    assert.match(dryDone, />Done</);
    assert.match(dryDone, />Wet</);
    // Only the Done-flash tile is selected.
    assert.match(
      dryDone,
      /data-diaper-kind="dry"[^>]*data-selected/,
    );
    assert.doesNotMatch(
      dryDone,
      /data-diaper-kind="wet"[^>]*data-selected/,
    );
  });
});
