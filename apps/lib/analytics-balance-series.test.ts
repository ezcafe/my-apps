import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeBalanceSeriesFromTxs } from "@/lib/analytics-balance-series";

describe("computeBalanceSeriesFromTxs", () => {
  it("returns current total when no transactions after bucket dates", () => {
    const points = computeBalanceSeriesFromTxs(
      10_000,
      [],
      ["2025-05-01", "2025-05-02"],
    );
    assert.equal(points.length, 2);
    assert.equal(points[0]?.totalMinor, 10_000);
    assert.equal(points[1]?.totalMinor, 10_000);
  });

  it("subtracts future transaction effects from current balance", () => {
    const points = computeBalanceSeriesFromTxs(
      5000,
      [
        {
          occurredAt: new Date("2025-05-02T12:00:00.000Z"),
          effect: -2000,
        },
        {
          occurredAt: new Date("2025-05-03T12:00:00.000Z"),
          effect: 1000,
        },
      ],
      ["2025-05-01", "2025-05-02", "2025-05-03"],
    );
    assert.equal(points[0]?.totalMinor, 6000);
    assert.equal(points[1]?.totalMinor, 4000);
    assert.equal(points[2]?.totalMinor, 5000);
  });
});
