import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  babyInsightsDateBoundsIso,
  babyInsightsDefaultRange,
} from "@/lib/baby-insights-default-range";

describe("babyInsightsDefaultRange", () => {
  it("returns last 7 local days ending today (inclusive)", () => {
    const range = babyInsightsDefaultRange(new Date(2026, 8, 15));
    assert.deepEqual(range, { fromDate: "2026-09-09", toDate: "2026-09-15" });
  });

  it("crosses month boundaries for the 7-day window", () => {
    const range = babyInsightsDefaultRange(new Date(2026, 9, 3));
    assert.deepEqual(range, { fromDate: "2026-09-27", toDate: "2026-10-03" });
  });
});

describe("babyInsightsDateBoundsIso", () => {
  it("maps local dates to inclusive day ISO bounds", () => {
    const { from, to } = babyInsightsDateBoundsIso("2026-09-01", "2026-09-30");
    assert.equal(from, new Date(2026, 8, 1, 0, 0, 0, 0).toISOString());
    assert.equal(to, new Date(2026, 8, 30, 23, 59, 59, 999).toISOString());
  });

  it("maps same-day today to inclusive start and end of that day", () => {
    const { from, to } = babyInsightsDateBoundsIso("2026-09-15", "2026-09-15");
    assert.equal(from, new Date(2026, 8, 15, 0, 0, 0, 0).toISOString());
    assert.equal(to, new Date(2026, 8, 15, 23, 59, 59, 999).toISOString());
  });
});
