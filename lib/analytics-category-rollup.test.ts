import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ANALYTICS_OTHER_KEY,
  ANALYTICS_OTHER_LABEL,
  rollupCategoryByMonth,
  rollupPieRows,
  rollupSankeyInputRows,
} from "@/lib/analytics-category-rollup";

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

describe("rollupPieRows", () => {
  it("keeps top slices and conserves total in Other", () => {
    const rows = [
      { categoryId: "a", label: "A", valueMinor: 100 },
      { categoryId: "b", label: "B", valueMinor: 90 },
      { categoryId: "c", label: "C", valueMinor: 80 },
      { categoryId: null, label: "Uncategorized", valueMinor: 10 },
    ];
    const rolled = rollupPieRows(rows, 2);
    assert.equal(rolled.length, 3);
    assert.equal(
      rolled.reduce((sum, row) => sum + row.valueMinor, 0),
      rows.reduce((sum, row) => sum + row.valueMinor, 0),
    );
    const other = rolled.find((row) => row.categoryId === ANALYTICS_OTHER_KEY);
    assert.ok(other);
    assert.equal(other!.label, ANALYTICS_OTHER_LABEL);
    assert.equal(other!.valueMinor, 90);
  });
});

describe("rollupSankeyInputRows", () => {
  it("remaps categories outside top-N onto Other", () => {
    const rows = [
      { kind: "income" as const, categoryId: "a", valueMinor: 500 },
      { kind: "expense" as const, categoryId: "b", valueMinor: 200 },
      { kind: "expense" as const, categoryId: "c", valueMinor: 50 },
      { kind: "expense" as const, categoryId: "d", valueMinor: 40 },
    ];
    const rolled = rollupSankeyInputRows(rows, 2);
    assert.equal(
      rolled.filter((row) => row.categoryId === ANALYTICS_OTHER_KEY).length,
      2,
    );
    assert.equal(
      rolled.reduce((sum, row) => sum + row.valueMinor, 0),
      rows.reduce((sum, row) => sum + row.valueMinor, 0),
    );
  });
});
