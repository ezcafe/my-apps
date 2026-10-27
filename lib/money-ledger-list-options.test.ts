import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  moneyLedgerListIncludeTotal,
  moneyLedgerSsrIncludeSummary,
} from "@/lib/money-ledger-list-options";
import { moneyLedgerFirstLoadFilterQuery } from "@/lib/money-first-load-filters";
import { MONEY_LEDGER_SPENDING } from "@/lib/money-ledger-presets";
import {
  moneyTransactionsListQueryInput,
  moneyTransactionsQueryOptions,
} from "@/lib/money-query-options";

describe("moneyLedgerListIncludeTotal", () => {
  it("ledger first-load skips exact total", () => {
    assert.equal(moneyLedgerListIncludeTotal(), false);
  });

  it("SSR/client list options for /money first load pass includeTotal false", () => {
    const includeTotal = moneyLedgerListIncludeTotal();
    const filterQuery = moneyLedgerFirstLoadFilterQuery(
      MONEY_LEDGER_SPENDING,
      [{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", type: "checking" }],
      [],
      new Date("2026-10-15T12:00:00"),
    );
    const input = moneyTransactionsListQueryInput(
      filterQuery,
      1,
      20,
      "occurredAt",
      "desc",
      includeTotal,
    );
    assert.equal(input.includeTotal, false);
    const key = moneyTransactionsQueryOptions(
      "ws",
      filterQuery,
      1,
      20,
      "occurredAt",
      "desc",
      includeTotal,
    ).queryKey;
    assert.ok(key.includes(false));
  });

  it("drilldown / analytics keep exact total (default true)", () => {
    const key = moneyTransactionsQueryOptions(
      "ws",
      "from=x&to=y",
      1,
      20,
      "occurredAt",
      "desc",
    ).queryKey;
    assert.ok(key.includes(true));
  });
});

describe("moneyLedgerSsrIncludeSummary", () => {
  it("/money SSR critical path does not request summary", () => {
    assert.equal(moneyLedgerSsrIncludeSummary(), false);
  });

  it("Spending page source omits includeSummary true on prefetch", () => {
    const src = readFileSync(
      resolve(process.cwd(), "app/(shell)/money/(tabs)/page.tsx"),
      "utf8",
    );
    assert.doesNotMatch(src, /includeSummary:\s*true/);
  });
});
