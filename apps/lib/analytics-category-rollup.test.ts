import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rollupCategoryByMonth } from "@/lib/analytics-category-rollup";

describe("rollupCategoryByMonth", () => {
  it("keeps top categories and buckets the rest into Other", () => {
    const stacked = rollupCategoryByMonth(
      [
        { month: "2025-05", categoryId: "a", label: "A", expenseMinor: 100 },
        { month: "2025-05", categoryId: "b", label: "B", expenseMinor: 50 },
        { month: "2025-05", categoryId: "c", label: "C", expenseMinor: 10 },
        { month: "2025-06", categoryId: "a", label: "A", expenseMinor: 80 },
        { month: "2025-06", categoryId: "c", label: "C", expenseMinor: 5 },
      ],
      2,
    );
    assert.equal(stacked.length, 2);
    const may = stacked.find((m) => m.month === "2025-05");
    assert.ok(may);
    const otherMay = may!.series.find((s) => s.label === "Other");
    assert.equal(otherMay?.valueMinor, 10);
    const aMay = may!.series.find((s) => s.label === "A");
    assert.equal(aMay?.valueMinor, 100);
  });
});
