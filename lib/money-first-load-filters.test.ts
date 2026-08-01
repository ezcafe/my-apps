import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildQuery } from "@/lib/analytics-build-query";
import { defaultAnalyticsFilters } from "@/lib/analytics-default-filters";
import {
  investmentDefaultChartRange,
  moneyDefaultMonthFilterQuery,
  moneyLedgerFirstLoadFilterQuery,
} from "@/lib/money-first-load-filters";
import {
  MONEY_LEDGER_BILLS,
  MONEY_LEDGER_SAVINGS,
  MONEY_LEDGER_SPENDING,
  defaultFiltersForLedgerPreset,
  mergeLedgerPresetQuery,
  resolveLedgerPresetCategoryIds,
} from "@/lib/money-ledger-presets";
import { MONEY_SEED_BILLS, MONEY_SEED_NECESSITIES } from "@/lib/money-seed-defaults";

const FIXED = new Date(2026, 7, 1); // Aug 1, 2026 local

describe("moneyDefaultMonthFilterQuery", () => {
  it("matches buildQuery(defaultAnalyticsFilters(now))", () => {
    const expected = buildQuery(defaultAnalyticsFilters(FIXED));
    assert.equal(moneyDefaultMonthFilterQuery(FIXED), expected);
  });
});

describe("moneyLedgerFirstLoadFilterQuery", () => {
  const categories = [
    { id: "n1", name: MONEY_SEED_NECESSITIES, parentId: null },
    { id: "b1", name: MONEY_SEED_BILLS, parentId: "n1" },
  ];
  const accounts = [
    { id: "a1", type: "checking" },
    { id: "a2", type: "savings" },
  ];

  it("matches spending client first-load keys", () => {
    const applied = defaultFiltersForLedgerPreset(
      MONEY_LEDGER_SPENDING,
      accounts,
      categories,
    );
    const withNow = defaultAnalyticsFilters(FIXED);
    applied.fromDate = withNow.fromDate;
    applied.toDate = withNow.toDate;
    const categoryIds = resolveLedgerPresetCategoryIds(
      MONEY_LEDGER_SPENDING,
      categories,
    );
    const expected = mergeLedgerPresetQuery(
      buildQuery(applied),
      MONEY_LEDGER_SPENDING,
      categoryIds.length > 0 ? categoryIds : undefined,
    );
    assert.equal(
      moneyLedgerFirstLoadFilterQuery(
        MONEY_LEDGER_SPENDING,
        accounts,
        categories,
        FIXED,
      ),
      expected,
    );
    assert.ok(expected.includes("excludeAccountTypes=savings"));
  });

  it("resolves bills category seed", () => {
    const q = moneyLedgerFirstLoadFilterQuery(
      MONEY_LEDGER_BILLS,
      accounts,
      categories,
      FIXED,
    );
    assert.ok(q.includes("categoryIds=b1"));
    assert.ok(q.includes("kinds=expense"));
  });

  it("locks savings accountTypes", () => {
    const q = moneyLedgerFirstLoadFilterQuery(
      MONEY_LEDGER_SAVINGS,
      accounts,
      categories,
      FIXED,
    );
    assert.ok(q.includes("accountTypes=savings"));
  });
});

describe("investmentDefaultChartRange", () => {
  it("returns YYYY-MM-DD from/to for monthsBack", () => {
    const range = investmentDefaultChartRange(6, FIXED);
    assert.equal(range.to, "2026-08-01");
    assert.equal(range.from, "2026-02-01");
  });
});
