import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BABY_BOTTLE_CHIPS_NO_BIRTH_SNAPS } from "@/lib/baby-age-guide";
import {
  babyHomeCustomInitialMl,
  ensureMlInBottleChips,
  resolveBabyHomeSelectedBottleMl,
} from "@/lib/baby-home-bottle-selection";

describe("resolveBabyHomeSelectedBottleMl", () => {
  it("prefers done-flash ml", () => {
    assert.equal(
      resolveBabyHomeSelectedBottleMl({
        bottleDoneMl: 150,
        formulaFromCustom: false,
        formulaOverride: null,
      }),
      150,
    );
  });

  it("idle has no selected ml (no last-feed / recent highlight)", () => {
    assert.equal(
      resolveBabyHomeSelectedBottleMl({
        bottleDoneMl: null,
        formulaFromCustom: false,
        formulaOverride: null,
      }),
      null,
    );
  });

  it("uses pending Custom override while waiting to save", () => {
    assert.equal(
      resolveBabyHomeSelectedBottleMl({
        bottleDoneMl: null,
        formulaFromCustom: true,
        formulaOverride: 95,
      }),
      95,
    );
  });
});

describe("babyHomeCustomInitialMl", () => {
  it("no-birth does not seed feed FALLBACK ~120 as recommended", () => {
    assert.equal(
      babyHomeCustomInitialMl({
        formulaOverride: null,
        birthDate: null,
        suggestedMl: 120,
        firstChipMl: 60,
      }),
      60,
    );
    assert.equal(
      babyHomeCustomInitialMl({
        formulaOverride: null,
        birthDate: null,
        suggestedMl: 120,
        firstChipMl: null,
      }),
      BABY_BOTTLE_CHIPS_NO_BIRTH_SNAPS[1],
    );
    assert.equal(BABY_BOTTLE_CHIPS_NO_BIRTH_SNAPS[1], 90);
  });

  it("birth set uses suggested ml; override wins", () => {
    assert.equal(
      babyHomeCustomInitialMl({
        formulaOverride: null,
        birthDate: "2026-01-01",
        suggestedMl: 110,
        firstChipMl: 90,
      }),
      110,
    );
    assert.equal(
      babyHomeCustomInitialMl({
        formulaOverride: 85,
        birthDate: null,
        suggestedMl: 120,
        firstChipMl: 60,
      }),
      85,
    );
  });
});

describe("ensureMlInBottleChips", () => {
  it("prepends flash/custom ml when missing so done chip stays visible", () => {
    assert.deepEqual(ensureMlInBottleChips([90, 120, 150], 95), [
      95,
      90,
      120,
    ]);
    assert.deepEqual(ensureMlInBottleChips([90, 120, 150], 90), [
      90,
      120,
      150,
    ]);
    assert.deepEqual(ensureMlInBottleChips([90, 120], null), [90, 120]);
  });
});
