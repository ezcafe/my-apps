import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { expenseMomTrend } from "@/components/analytics-stats";

describe("expenseMomTrend", () => {
  it("returns null with fewer than two expense months", () => {
    assert.equal(expenseMomTrend([]), null);
    assert.equal(
      expenseMomTrend([{ month: "2026-08", expenseMinor: 100, incomeMinor: 0 }]),
      null,
    );
  });

  it("returns up when last month expense rises", () => {
    assert.deepEqual(
      expenseMomTrend([
        { month: "2026-07", expenseMinor: 1000, incomeMinor: 0 },
        { month: "2026-08", expenseMinor: 1120, incomeMinor: 0 },
      ]),
      { pct: 12, direction: "up" },
    );
  });

  it("returns down when last month expense falls", () => {
    assert.deepEqual(
      expenseMomTrend([
        { month: "2026-07", expenseMinor: 1000, incomeMinor: 0 },
        { month: "2026-08", expenseMinor: 800, incomeMinor: 0 },
      ]),
      { pct: 20, direction: "down" },
    );
  });

  it("returns flat when rounded pct is 0", () => {
    assert.deepEqual(
      expenseMomTrend([
        { month: "2026-07", expenseMinor: 1000, incomeMinor: 0 },
        { month: "2026-08", expenseMinor: 1004, incomeMinor: 0 },
      ]),
      { pct: 0, direction: "flat" },
    );
  });

  it("ignores zero-expense months when picking prior/current", () => {
    assert.deepEqual(
      expenseMomTrend([
        { month: "2026-06", expenseMinor: 500, incomeMinor: 0 },
        { month: "2026-07", expenseMinor: 0, incomeMinor: 100 },
        { month: "2026-08", expenseMinor: 1000, incomeMinor: 0 },
      ]),
      { pct: 100, direction: "up" },
    );
  });
});
