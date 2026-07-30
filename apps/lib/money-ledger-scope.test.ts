import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultAnalyticsFilters } from "@/components/analytics-filters";
import {
  buildMoneyAnalyticsFilterQuery,
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
