import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  babyGrowthChartCopy,
  growthEntriesToSeries,
} from "@/lib/baby-growth-series";

describe("growthEntriesToSeries", () => {
  it("maps entries to {x,y}[] sorted by time", () => {
    const series = growthEntriesToSeries([
      { recordedAt: new Date("2026-09-02T00:00:00Z"), valueNum: "3.5" },
      { recordedAt: new Date("2026-09-01T00:00:00Z"), valueNum: "3.2" },
      { recordedAt: new Date("2026-09-03T00:00:00Z"), valueNum: null },
    ]);
    assert.deepEqual(series, [
      { x: Date.parse("2026-09-01T00:00:00Z"), y: 3.2 },
      { x: Date.parse("2026-09-02T00:00:00Z"), y: 3.5 },
    ]);
  });

  it("keeps head and temperature numeric points; skips text-only", () => {
    const head = growthEntriesToSeries([
      { recordedAt: new Date("2026-09-01T00:00:00Z"), valueNum: "36.5" },
    ]);
    const temp = growthEntriesToSeries([
      { recordedAt: new Date("2026-09-01T00:00:00Z"), valueNum: "37.1" },
    ]);
    const medTextOnly = growthEntriesToSeries([
      { recordedAt: new Date("2026-09-01T00:00:00Z"), valueNum: null },
    ]);
    assert.equal(head.length, 1);
    assert.equal(temp[0]?.y, 37.1);
    assert.equal(medTextOnly.length, 0);
  });
});

describe("babyGrowthChartCopy", () => {
  it("never claims empty while growth pages remain", () => {
    assert.equal(
      babyGrowthChartCopy({
        pointCount: 0,
        growthIncomplete: true,
        canLoadMore: true,
      }),
      "partial",
    );
    assert.equal(
      babyGrowthChartCopy({
        pointCount: 0,
        growthIncomplete: false,
        canLoadMore: false,
      }),
      "empty",
    );
  });

  it("flags partial when points exist but more pages remain", () => {
    assert.equal(
      babyGrowthChartCopy({
        pointCount: 3,
        growthIncomplete: true,
        canLoadMore: true,
      }),
      "partial",
    );
    assert.equal(
      babyGrowthChartCopy({
        pointCount: 3,
        growthIncomplete: false,
        canLoadMore: false,
      }),
      "ready",
    );
  });

  it("uses capped copy when incomplete but Load more is not available", () => {
    assert.equal(
      babyGrowthChartCopy({
        pointCount: 2,
        growthIncomplete: true,
        canLoadMore: false,
      }),
      "partialCapped",
    );
  });
});
