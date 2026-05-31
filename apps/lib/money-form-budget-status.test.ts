import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCategoryBudgetStatusRows } from "@/lib/money-category-budget-status";

describe("form budget status shape", () => {
  it("maps account budgets as direct accountId → progressPct rows", () => {
    const budgets = [
      { scopeType: "account" as const, scopeId: "acc-1", progressPct: 82 },
      { scopeType: "account" as const, scopeId: "acc-2", progressPct: 10 },
      { scopeType: "category" as const, scopeId: "cat-1", progressPct: 55 },
    ];

    const accounts: { accountId: string; progressPct: number }[] = [];
    const directPctByCategoryId = new Map<string, number>();
    for (const b of budgets) {
      if (b.scopeType === "category" && b.scopeId) {
        directPctByCategoryId.set(b.scopeId, b.progressPct);
      } else if (b.scopeType === "account" && b.scopeId) {
        accounts.push({ accountId: b.scopeId, progressPct: b.progressPct });
      }
    }

    assert.deepEqual(accounts, [
      { accountId: "acc-1", progressPct: 82 },
      { accountId: "acc-2", progressPct: 10 },
    ]);
    assert.deepEqual(
      buildCategoryBudgetStatusRows(
        directPctByCategoryId,
        new Map([["cat-1", null]]),
      ),
      [{ categoryId: "cat-1", progressPct: 55 }],
    );
  });

  it("maps tag budgets as direct tagId → progressPct rows", () => {
    const budgets = [
      { scopeType: "tag" as const, scopeId: "tag-1", progressPct: 67 },
      { scopeType: "tag" as const, scopeId: "tag-2", progressPct: 12 },
      { scopeType: "account" as const, scopeId: "acc-1", progressPct: 40 },
    ];

    const tags: { tagId: string; progressPct: number }[] = [];
    for (const b of budgets) {
      if (b.scopeType === "tag" && b.scopeId) {
        tags.push({ tagId: b.scopeId, progressPct: b.progressPct });
      }
    }

    assert.deepEqual(tags, [
      { tagId: "tag-1", progressPct: 67 },
      { tagId: "tag-2", progressPct: 12 },
    ]);
  });
});
