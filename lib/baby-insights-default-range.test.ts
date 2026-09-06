import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  babyInsightsDateBoundsIso,
  babyInsightsDefaultRange,
} from "@/lib/baby-insights-default-range";

describe("babyInsightsDefaultRange", () => {
  it("returns this calendar month as YYYY-MM-DD", () => {
    const range = babyInsightsDefaultRange(new Date(2026, 8, 15));
    assert.deepEqual(range, { fromDate: "2026-09-01", toDate: "2026-09-30" });
  });
});

describe("babyInsightsDateBoundsIso", () => {
  it("maps local dates to inclusive day ISO bounds", () => {
    const { from, to } = babyInsightsDateBoundsIso("2026-09-01", "2026-09-30");
    assert.equal(from, new Date(2026, 8, 1, 0, 0, 0, 0).toISOString());
    assert.equal(to, new Date(2026, 8, 30, 23, 59, 59, 999).toISOString());
  });
});
