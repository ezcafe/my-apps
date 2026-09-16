import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  babyInsightsFiltersDirty,
  emptyBabyInsightsChips,
  filterGrowthByKindChips,
  filterGrowthByMergedChips,
  filterTimelineByCareChips,
  filterTimelineByMergedChips,
  growthKindVisibleInMergedChips,
  mergeBabyInsightsFilterChips,
  splitBabyInsightsFilterChips,
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

describe("filterTimelineByMergedChips / filterGrowthByMergedChips", () => {
  const timeline = [
    { id: "1", kind: "care", type: "feed" },
    { id: "2", kind: "care", type: "diaper" },
    { id: "3", kind: "growth", type: "head" },
  ];
  const growth = [
    { id: "a", kind: "head" },
    { id: "b", kind: "weight" },
  ];

  it("empty merged selection keeps everything", () => {
    const chips = emptyBabyInsightsChips();
    assert.equal(filterTimelineByMergedChips(timeline, chips).length, 3);
    assert.equal(filterGrowthByMergedChips(growth, chips).length, 2);
  });

  it("Diaper alone drops Head and other care types", () => {
    const chips = { careTypes: ["diaper"] as const, growthKinds: [] as const };
    assert.deepEqual(
      filterTimelineByMergedChips(timeline, chips).map((r) => r.id),
      ["2"],
    );
    assert.deepEqual(filterGrowthByMergedChips(growth, chips).map((r) => r.id), []);
    assert.equal(growthKindVisibleInMergedChips("head", chips), false);
  });

  it("Diaper + Head keeps both", () => {
    const chips = {
      careTypes: ["diaper"] as const,
      growthKinds: ["head"] as const,
    };
    assert.deepEqual(
      filterTimelineByMergedChips(timeline, chips).map((r) => r.id),
      ["2", "3"],
    );
    assert.deepEqual(
      filterGrowthByMergedChips(growth, chips).map((r) => r.id),
      ["a"],
    );
    assert.equal(growthKindVisibleInMergedChips("head", chips), true);
    assert.equal(growthKindVisibleInMergedChips("weight", chips), false);
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

describe("mergeBabyInsightsFilterChips / splitBabyInsightsFilterChips", () => {
  it("round-trips care + measure ids", () => {
    const chips = {
      careTypes: ["feed", "diaper"] as const,
      growthKinds: ["weight", "height"] as const,
    };
    const merged = mergeBabyInsightsFilterChips({
      careTypes: [...chips.careTypes],
      growthKinds: [...chips.growthKinds],
    });
    assert.deepEqual(merged, ["feed", "diaper", "weight", "height"]);
    assert.deepEqual(splitBabyInsightsFilterChips(merged), {
      careTypes: ["feed", "diaper"],
      growthKinds: ["weight", "height"],
    });
  });

  it("ignores unknown ids when splitting", () => {
    assert.deepEqual(splitBabyInsightsFilterChips(["feed", "nope", "weight"]), {
      careTypes: ["feed"],
      growthKinds: ["weight"],
    });
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
