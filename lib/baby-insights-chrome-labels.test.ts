import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyBabyInsightsToolbarMultiSelect,
  babyInsightsCareGrowthMultiSelects,
} from "@/lib/baby-insights-chrome-labels";
import { emptyBabyInsightsChips } from "@/lib/baby-insights-filters";
import { t } from "@/lib/baby-i18n";

describe("babyInsightsCareGrowthMultiSelects", () => {
  it("builds Care + Growth filters with short toolbar labels", () => {
    const filters = babyInsightsCareGrowthMultiSelects(
      emptyBabyInsightsChips(),
      (key) => t(key, "en"),
    );
    assert.equal(filters.length, 2);
    assert.equal(filters[0]!.id, "care");
    assert.equal(filters[0]!.label, "Care");
    assert.equal(filters[1]!.id, "growth");
    assert.equal(filters[1]!.label, "Growth");
    assert.deepEqual(
      filters[0]!.items.map((i) => i.id),
      ["feed", "sleep", "diaper"],
    );
    assert.ok(filters[1]!.items.some((i) => i.id === "weight"));
  });

  it("maps value from draft chips", () => {
    const filters = babyInsightsCareGrowthMultiSelects(
      { careTypes: ["sleep"], growthKinds: ["weight"] },
      (key) => t(key, "en"),
    );
    assert.deepEqual(filters[0]!.value, ["sleep"]);
    assert.deepEqual(filters[1]!.value, ["weight"]);
  });
});

describe("applyBabyInsightsToolbarMultiSelect", () => {
  it("updates careTypes from Care filter ids", () => {
    const next = applyBabyInsightsToolbarMultiSelect(
      emptyBabyInsightsChips(),
      "care",
      ["sleep", "feed"],
    );
    assert.deepEqual(next.careTypes, ["sleep", "feed"]);
    assert.deepEqual(next.growthKinds, []);
  });

  it("updates growthKinds from Growth filter ids", () => {
    const next = applyBabyInsightsToolbarMultiSelect(
      { careTypes: ["diaper"], growthKinds: [] },
      "growth",
      ["height"],
    );
    assert.deepEqual(next.careTypes, ["diaper"]);
    assert.deepEqual(next.growthKinds, ["height"]);
  });
});
