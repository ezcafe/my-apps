import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BABY_FEED_GUIDE_FALLBACK } from "@/lib/baby-age-guide";
import {
  BABY_FORMULA_HARD_MAX_ML,
  BABY_FORMULA_HARD_MIN_ML,
  BABY_FORMULA_STEP_ML,
  isBabyFormulaCustom,
  parseBabyCustomMl,
  stepBabyFormulaMl,
} from "@/lib/baby-quick-value-steppers";

const band = { ...BABY_FEED_GUIDE_FALLBACK, feedsMax: 8 }; // 60–150

describe("stepBabyFormulaMl", () => {
  it("moves by 10 and clamps at band edges", () => {
    assert.equal(BABY_FORMULA_STEP_ML, 10);
    assert.equal(stepBabyFormulaMl(60, -1, band), 60);
    assert.equal(stepBabyFormulaMl(150, 1, band), 150);
    assert.equal(stepBabyFormulaMl(100, 1, band), 110);
    assert.equal(stepBabyFormulaMl(100, -1, band), 90);
  });

  it("never returns a non-multiple of 10; snaps outside values into band", () => {
    assert.equal(stepBabyFormulaMl(95, 1, band) % 10, 0);
    assert.equal(stepBabyFormulaMl(5, 1, band), 60);
    assert.equal(stepBabyFormulaMl(400, -1, band), 150);
  });
});

describe("isBabyFormulaCustom", () => {
  it("is false inside the band and true outside", () => {
    assert.equal(isBabyFormulaCustom(120, band), false);
    assert.equal(isBabyFormulaCustom(95, band), false); // 95 is inside 60–150
    assert.equal(isBabyFormulaCustom(50, band), true);
    assert.equal(isBabyFormulaCustom(200, band), true);
  });
});
describe("parseBabyCustomMl", () => {
  it("accepts whole positive amounts inside hard bounds", () => {
    assert.deepEqual(parseBabyCustomMl("95"), { ok: true, ml: 95 });
    assert.deepEqual(parseBabyCustomMl("120"), { ok: true, ml: 120 });
    assert.deepEqual(parseBabyCustomMl(" 120 "), { ok: true, ml: 120 });
  });

  it("returns the right reason keys", () => {
    for (const raw of ["", "abc", "12abc", "1e3", "Infinity", "NaN"]) {
      assert.deepEqual(parseBabyCustomMl(raw), {
        ok: false,
        reasonKey: "home.customMlInvalid",
      });
    }
    assert.deepEqual(parseBabyCustomMl("12.5"), {
      ok: false,
      reasonKey: "home.customMlWhole",
    });
    for (const raw of ["0", "-30"]) {
      assert.deepEqual(parseBabyCustomMl(raw), {
        ok: false,
        reasonKey: "home.customMlInvalid",
      });
    }
    assert.deepEqual(parseBabyCustomMl("5"), {
      ok: false,
      reasonKey: "home.customMlTooLow",
    });
    assert.deepEqual(parseBabyCustomMl("400"), {
      ok: false,
      reasonKey: "home.customMlTooHigh",
    });
    assert.equal(BABY_FORMULA_HARD_MIN_ML, 10);
    assert.equal(BABY_FORMULA_HARD_MAX_ML, 300);
  });
});
