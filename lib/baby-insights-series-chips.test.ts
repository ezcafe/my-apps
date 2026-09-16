import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  careChipAllows,
  filterCareCountDaysByCareChips,
  filterHydrationDaysByCareChips,
  filterNightRestDaysByCareChips,
  seriesChartVisibleForCareChips,
} from "@/lib/baby-insights-series-chips";

describe("careChipAllows", () => {
  it("empty selection allows all", () => {
    assert.equal(careChipAllows([], "feed"), true);
    assert.equal(careChipAllows([], "diaper"), true);
  });

  it("non-empty selection is exclusive", () => {
    assert.equal(careChipAllows(["diaper"], "diaper"), true);
    assert.equal(careChipAllows(["diaper"], "feed"), false);
  });
});

describe("filterHydrationDaysByCareChips", () => {
  const days = [
    { date: "2026-09-14", wetCount: 4, feedCount: 6, formulaMl: 120 },
    { date: "2026-09-15", wetCount: 0, feedCount: 2, formulaMl: null },
  ];

  it("empty chips leave days unchanged", () => {
    assert.deepEqual(filterHydrationDaysByCareChips(days, []), days);
  });

  it("diaper-only zeros feeds and drops feed-only days", () => {
    const filtered = filterHydrationDaysByCareChips(days, ["diaper"]);
    assert.deepEqual(filtered, [
      { date: "2026-09-14", wetCount: 4, feedCount: 0, formulaMl: null },
    ]);
  });

  it("sleep-only yields empty hydration", () => {
    assert.deepEqual(filterHydrationDaysByCareChips(days, ["sleep"]), []);
  });
});

describe("filterNightRestDaysByCareChips", () => {
  const days = [
    { date: "2026-09-14", nightSleepMinutes: 400, intervalCount: 1 },
  ];

  it("empty chips keep nights", () => {
    assert.deepEqual(filterNightRestDaysByCareChips(days, []), days);
  });

  it("feed-only hides night rest", () => {
    assert.deepEqual(filterNightRestDaysByCareChips(days, ["feed"]), []);
  });

  it("sleep keeps nights", () => {
    assert.deepEqual(filterNightRestDaysByCareChips(days, ["sleep"]), days);
  });
});

describe("filterCareCountDaysByCareChips", () => {
  const days = [
    { day: "2026-09-14", feed: 3, sleep: 2, diaper: 4 },
    { day: "2026-09-15", feed: 0, sleep: 1, diaper: 0 },
  ];

  it("diaper-only zeros other series and drops sleep-only days", () => {
    assert.deepEqual(filterCareCountDaysByCareChips(days, ["diaper"]), [
      { day: "2026-09-14", feed: 0, sleep: 0, diaper: 4 },
    ]);
  });
});

describe("seriesChartVisibleForCareChips", () => {
  it("diaper output needs diaper chip when filtered", () => {
    assert.equal(seriesChartVisibleForCareChips(["feed"], ["diaper"]), false);
    assert.equal(seriesChartVisibleForCareChips(["diaper"], ["diaper"]), true);
    assert.equal(seriesChartVisibleForCareChips([], ["diaper"]), true);
  });
});
