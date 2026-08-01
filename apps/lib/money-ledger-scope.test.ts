import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultAnalyticsFilters } from "@/components/analytics-filters";
import {
  buildMoneyAnalyticsFilterQuery,
  defaultFiltersForLedgerPreset,
  MONEY_LEDGER_BILLS,
  MONEY_LEDGER_LOAN,
  MONEY_LEDGER_SPENDING,
  parseMoneyLedgerScopeId,
} from "@/lib/money-ledger-presets";

describe("parseMoneyLedgerScopeId", () => {
  it("maps known ledger params", () => {
    assert.equal(parseMoneyLedgerScopeId("savings"), "savings");
    assert.equal(parseMoneyLedgerScopeId("investments"), "investments");
  });

  it("defaults to all", () => {
    assert.equal(parseMoneyLedgerScopeId(null), "all");
    assert.equal(parseMoneyLedgerScopeId("nope"), "all");
  });
});

describe("buildMoneyAnalyticsFilterQuery", () => {
  it("returns base query for all scope", () => {
    const applied = defaultAnalyticsFilters();
    const q = buildMoneyAnalyticsFilterQuery(applied, "all", []);
    assert.ok(q.includes("from="));
    assert.ok(!q.includes("excludeAccountTypes"));
  });

  it("applies spending preset locks", () => {
    const applied = defaultAnalyticsFilters();
    const q = buildMoneyAnalyticsFilterQuery(applied, "spending", []);
    assert.ok(q.includes("excludeAccountTypes=savings"));
    assert.ok(q.includes("kinds=expense"));
  });
});

describe("defaultFiltersForLedgerPreset", () => {
  const accounts = [
    { id: "a-checking", type: "checking" },
    { id: "a-loan", type: "loan" },
    { id: "a-loan-2", type: "loan" },
    { id: "a-savings", type: "savings" },
  ];
  const categories = [
    { id: "c-nec", name: "Necessities", parentId: null },
    { id: "c-bills", name: "Bills", parentId: "c-nec" },
    { id: "c-food", name: "Food", parentId: "c-nec" },
  ];

  it("selects loan accounts for the loans preset", () => {
    const filters = defaultFiltersForLedgerPreset(
      MONEY_LEDGER_LOAN,
      accounts,
      categories,
    );
    assert.deepEqual(filters.accountIds, ["a-loan", "a-loan-2"]);
    assert.deepEqual(filters.kinds, []);
    assert.deepEqual(filters.categoryIds, []);
  });

  it("selects Bills category and expense for the bills preset", () => {
    const filters = defaultFiltersForLedgerPreset(
      MONEY_LEDGER_BILLS,
      accounts,
      categories,
    );
    assert.deepEqual(filters.categoryIds, ["c-bills"]);
    assert.deepEqual(filters.kinds, ["expense"]);
    assert.deepEqual(filters.accountIds, []);
  });

  it("selects spending kinds without account picks", () => {
    const filters = defaultFiltersForLedgerPreset(
      MONEY_LEDGER_SPENDING,
      accounts,
      categories,
    );
    assert.deepEqual(filters.kinds, ["expense", "income", "transfer"]);
    assert.deepEqual(filters.accountIds, []);
  });

  it("returns month defaults when preset is undefined", () => {
    const filters = defaultFiltersForLedgerPreset(undefined, accounts, categories);
    const base = defaultAnalyticsFilters();
    assert.deepEqual(filters.accountIds, []);
    assert.deepEqual(filters.categoryIds, []);
    assert.deepEqual(filters.kinds, []);
    assert.equal(filters.fromDate, base.fromDate);
    assert.equal(filters.toDate, base.toDate);
  });
});
