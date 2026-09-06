import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  babyInsightsFiltersDirty,
  emptyBabyInsightsChips,
  filterGrowthByKindChips,
  filterTimelineByCareChips,
  toggleBabyInsightsCareChip,
  toggleBabyInsightsGrowthChip,
} from "@/lib/baby-insights-filters";

describe("filterTimelineByCareChips", () => {
  const rows = [
    { id: "1", kind: "care", type: "feed" },
    { id: "2", kind: "care", type: "diaper" },
    { id: "3", kind: "growth", type: "weight" },
  ];

  it("returns all when no care chips selected", () => {
    assert.equal(filterTimelineByCareChips(rows, []).length, 3);
  });

  it("keeps matching care rows and all growth rows", () => {
    const filtered = filterTimelineByCareChips(rows, ["feed"]);
    assert.deepEqual(
      filtered.map((r) => r.id),
      ["1", "3"],
    );
  });
});

describe("filterGrowthByKindChips", () => {
  const rows = [
    { id: "a", kind: "weight" },
    { id: "b", kind: "height" },
  ];

  it("returns all when growthKinds empty", () => {
    assert.deepEqual(
      filterGrowthByKindChips(rows, []).map((r) => r.id),
      ["a", "b"],
    );
  });

  it("filters to selected growth kinds", () => {
    assert.deepEqual(
      filterGrowthByKindChips(rows, ["weight"]).map((r) => r.id),
      ["a"],
    );
  });

  it("care chips alone leave growth rows unfiltered", () => {
    // Independence: selecting Feed must not wipe growth charts.
    assert.deepEqual(
      filterGrowthByKindChips(rows, []).map((r) => r.id),
      ["a", "b"],
    );
    const timeline = filterTimelineByCareChips(
      [
        { id: "1", kind: "care", type: "feed" },
        { id: "2", kind: "care", type: "diaper" },
        { id: "3", kind: "growth", type: "weight" },
      ],
      ["feed"],
    );
    assert.deepEqual(
      timeline.map((r) => r.id),
      ["1", "3"],
    );
  });
});

describe("toggleBabyInsightsCareChip", () => {
  it("adds and removes", () => {
    assert.deepEqual(toggleBabyInsightsCareChip([], "feed"), ["feed"]);
    assert.deepEqual(toggleBabyInsightsCareChip(["feed"], "feed"), []);
  });
});

describe("toggleBabyInsightsGrowthChip", () => {
  it("adds and removes", () => {
    assert.deepEqual(toggleBabyInsightsGrowthChip([], "weight"), ["weight"]);
    assert.deepEqual(
      toggleBabyInsightsGrowthChip(["weight", "height"], "weight"),
      ["height"],
    );
  });
});

describe("babyInsightsFiltersDirty", () => {
  it("detects date or chip changes", () => {
    const base = {
      fromDate: "2026-09-01",
      toDate: "2026-09-30",
      chips: emptyBabyInsightsChips(),
    };
    assert.equal(babyInsightsFiltersDirty(base, base), false);
    assert.equal(
      babyInsightsFiltersDirty(
        { ...base, chips: { careTypes: ["feed"], growthKinds: [] } },
        base,
      ),
      true,
    );
    assert.equal(
      babyInsightsFiltersDirty(
        { ...base, chips: { careTypes: [], growthKinds: ["weight"] } },
        base,
      ),
      true,
    );
    assert.equal(
      babyInsightsFiltersDirty({ ...base, toDate: "2026-09-15" }, base),
      true,
    );
  });
});
