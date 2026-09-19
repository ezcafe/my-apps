import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BABY_INSIGHTS_GROWTH_CHIPS } from "@/lib/baby-insights-filters";
import {
  BABY_GROWTH_CAPTURE_HREF,
  BABY_GROWTH_PAGE_CHIPS,
  BABY_GROWTH_PAGE_DEFAULT_CHIP,
  BABY_VACCINE_CAPTURE_HREF,
  babyGrowthChipWhenKindParamChanges,
  babyGrowthSaveInvalidateScope,
  babyGrowthSaveMutationTarget,
  isBabyGrowthPageChip,
  isBabyGrowthPageDbKind,
  resolveBabyGrowthPageChipFromKindParam,
} from "@/lib/baby-growth-page-chips";

describe("BABY_GROWTH_PAGE_CHIPS", () => {
  it("locks Gate A2 order with vaccine first and no pump capture", () => {
    assert.deepEqual([...BABY_GROWTH_PAGE_CHIPS], [
      "vaccine",
      "vitamin",
      "medication",
      "temperature",
      "weight",
      "height",
      "head",
    ]);
    assert.equal(BABY_GROWTH_PAGE_CHIPS[0], "vaccine");
    assert.ok(!(BABY_GROWTH_PAGE_CHIPS as readonly string[]).includes("pump"));
    assert.equal(
      BABY_GROWTH_PAGE_CHIPS.filter((c) => c === "temperature").length,
      1,
    );
  });

  it("treats vaccine as UI chip but not a DB growth kind", () => {
    assert.equal(isBabyGrowthPageChip("vaccine"), true);
    assert.equal(isBabyGrowthPageDbKind("vaccine"), false);
    assert.equal(isBabyGrowthPageDbKind("weight"), true);
    assert.equal(isBabyGrowthPageChip("weight"), true);
  });

  it("does not silently extend Insights growth chips", () => {
    assert.deepEqual([...BABY_INSIGHTS_GROWTH_CHIPS], [
      "weight",
      "height",
      "head",
      "temperature",
      "medication",
    ]);
    assert.ok(!BABY_INSIGHTS_GROWTH_CHIPS.includes("vitamin" as never));
    assert.ok(!BABY_INSIGHTS_GROWTH_CHIPS.includes("pump" as never));
    assert.ok(!(BABY_INSIGHTS_GROWTH_CHIPS as readonly string[]).includes("vaccine"));
  });
});

describe("resolveBabyGrowthPageChipFromKindParam", () => {
  it("selects vaccine from kind=vaccine; unknown falls back to Weight", () => {
    assert.equal(resolveBabyGrowthPageChipFromKindParam("vaccine"), "vaccine");
    assert.equal(resolveBabyGrowthPageChipFromKindParam("weight"), "weight");
    assert.equal(resolveBabyGrowthPageChipFromKindParam(null), "weight");
    assert.equal(resolveBabyGrowthPageChipFromKindParam("nope"), "weight");
    assert.equal(BABY_GROWTH_PAGE_DEFAULT_CHIP, "weight");
  });
});

describe("babyGrowthSaveMutationTarget + invalidate scope", () => {
  it("routes vaccine chip to vaccine mutation + vaccines scope", () => {
    assert.equal(babyGrowthSaveMutationTarget("vaccine"), "vaccine");
    assert.equal(babyGrowthSaveInvalidateScope("vaccine"), "vaccines");
  });

  it("routes growth kinds to growth mutation + growth scope", () => {
    assert.equal(babyGrowthSaveMutationTarget("weight"), "growth");
    assert.equal(babyGrowthSaveInvalidateScope("weight"), "growth");
    assert.equal(babyGrowthSaveMutationTarget("pump"), "growth");
    assert.equal(babyGrowthSaveInvalidateScope("medication"), "growth");
  });
});

describe("BABY_VACCINE_CAPTURE_HREF", () => {
  it("points capture CTAs at Growth with vaccine preselected (not /baby/vaccines)", () => {
    assert.equal(BABY_VACCINE_CAPTURE_HREF, "/baby/growth?kind=vaccine");
    assert.doesNotMatch(BABY_VACCINE_CAPTURE_HREF, /\/baby\/vaccines/);
    assert.equal(BABY_GROWTH_CAPTURE_HREF, "/baby/growth");
  });
});

describe("babyGrowthChipWhenKindParamChanges", () => {
  it("land kind=vaccine → save reset Weight → sticky param must not flip chip back", () => {
    let appliedParam: string | null | undefined = undefined;
    let kind: string = BABY_GROWTH_PAGE_DEFAULT_CHIP;

    function applyFromUrl(nextParam: string | null) {
      const next = babyGrowthChipWhenKindParamChanges(appliedParam, nextParam);
      appliedParam = nextParam;
      if (next != null) kind = next;
    }

    applyFromUrl("vaccine");
    assert.equal(kind, "vaccine");

    // Post-save: local reset to Weight while URL still has sticky ?kind=vaccine.
    kind = BABY_GROWTH_PAGE_DEFAULT_CHIP;
    applyFromUrl("vaccine");
    assert.equal(kind, "weight");

    // Clear sticky kind (router.replace without kind).
    applyFromUrl(null);
    assert.equal(kind, "weight");
    assert.equal(BABY_GROWTH_CAPTURE_HREF, "/baby/growth");
  });
});
