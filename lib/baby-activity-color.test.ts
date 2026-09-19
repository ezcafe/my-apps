import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  babyActivityAccentCssVar,
  babyActivityAccentFamily,
} from "@/lib/baby-activity-color";

describe("babyActivityAccentFamily", () => {
  it("maps care types and feed methods", () => {
    assert.equal(
      babyActivityAccentFamily({ source: "care", careType: "sleep" }),
      "sleep",
    );
    assert.equal(
      babyActivityAccentFamily({ source: "care", careType: "diaper" }),
      "diaper",
    );
    assert.equal(
      babyActivityAccentFamily({
        source: "care",
        careType: "feed",
        payload: { method: "formula", amountMl: 120 },
      }),
      "feed",
    );
    assert.equal(
      babyActivityAccentFamily({
        source: "care",
        careType: "feed",
        payload: { method: "pump", amountMl: 90 },
      }),
      "pump",
    );
    assert.equal(
      babyActivityAccentFamily({
        source: "care",
        careType: "feed",
        payload: { legs: [{ method: "pump_l", durationSec: 60 }] },
      }),
      "pump",
    );
  });

  it("maps growth kinds", () => {
    assert.equal(
      babyActivityAccentFamily({ source: "growth", growthKind: "medication" }),
      "med",
    );
    assert.equal(
      babyActivityAccentFamily({ source: "growth", growthKind: "pump" }),
      "pump",
    );
    assert.equal(
      babyActivityAccentFamily({ source: "growth", growthKind: "weight" }),
      "growth",
    );
  });

  it("css var names are stable", () => {
    assert.equal(babyActivityAccentCssVar("sleep"), "--baby-act-sleep");
    assert.equal(babyActivityAccentCssVar("feed"), "--baby-act-feed");
  });
});
