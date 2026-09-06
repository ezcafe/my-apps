import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  babyInsightsGrowthKindsDirty,
  babyInsightsShowChipApplyRow,
} from "@/lib/baby-insights-mobile-apply";

describe("babyInsightsShowChipApplyRow", () => {
  it("shows Apply near growth chips when growth kinds are dirty", () => {
    assert.equal(
      babyInsightsShowChipApplyRow({ growthKindsDirty: true }),
      true,
    );
  });

  it("hides Apply row when growth kinds match applied", () => {
    assert.equal(
      babyInsightsShowChipApplyRow({ growthKindsDirty: false }),
      false,
    );
  });
});

describe("babyInsightsGrowthKindsDirty", () => {
  it("detects added or removed growth kinds", () => {
    assert.equal(babyInsightsGrowthKindsDirty(["weight"], []), true);
    assert.equal(babyInsightsGrowthKindsDirty(["weight"], ["weight"]), false);
    assert.equal(
      babyInsightsGrowthKindsDirty(["weight"], ["height"]),
      true,
    );
  });
});
