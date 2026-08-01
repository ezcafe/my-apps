import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCategoryBudgetStatusRows } from "@/lib/money-category-budget-status";

describe("buildCategoryBudgetStatusRows", () => {
  it("returns direct category utilization only when flat", () => {
    const rows = buildCategoryBudgetStatusRows(
      new Map([
        ["a", 30],
        ["b", 90],
      ]),
      new Map([
        ["a", null],
        ["b", null],
      ]),
    );
    assert.equal(rows.length, 2);
    assert.deepEqual(
      rows.sort((a, b) => a.categoryId.localeCompare(b.categoryId)),
      [
        { categoryId: "a", progressPct: 30 },
        { categoryId: "b", progressPct: 90 },
      ],
    );
  });

  it("propagates child budget status to parent without a direct budget", () => {
    const rows = buildCategoryBudgetStatusRows(
      new Map([["child", 85]]),
      new Map([
        ["parent", null],
        ["child", "parent"],
      ]),
    );
    assert.equal(rows.find((r) => r.categoryId === "child")?.progressPct, 85);
    assert.equal(rows.find((r) => r.categoryId === "parent")?.progressPct, 85);
  });

  it("uses max child utilization when multiple descendants have budgets", () => {
    const rows = buildCategoryBudgetStatusRows(
      new Map([
        ["c1", 40],
        ["c2", 75],
      ]),
      new Map([
        ["parent", null],
        ["c1", "parent"],
        ["c2", "parent"],
      ]),
    );
    assert.equal(rows.find((r) => r.categoryId === "parent")?.progressPct, 75);
  });

  it("does not overwrite parent when parent has its own budget", () => {
    const rows = buildCategoryBudgetStatusRows(
      new Map([
        ["parent", 20],
        ["child", 90],
      ]),
      new Map([
        ["parent", null],
        ["child", "parent"],
      ]),
    );
    assert.equal(rows.find((r) => r.categoryId === "parent")?.progressPct, 20);
    assert.equal(rows.find((r) => r.categoryId === "child")?.progressPct, 90);
  });

  it("propagates up multiple ancestor levels", () => {
    const rows = buildCategoryBudgetStatusRows(
      new Map([["leaf", 60]]),
      new Map([
        ["root", null],
        ["mid", "root"],
        ["leaf", "mid"],
      ]),
    );
    assert.equal(rows.find((r) => r.categoryId === "root")?.progressPct, 60);
    assert.equal(rows.find((r) => r.categoryId === "mid")?.progressPct, 60);
  });
});
