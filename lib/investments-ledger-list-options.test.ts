import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  moneyLedgerListIncludeTotal,
  moneyLedgerSsrIncludeSummary,
} from "@/lib/money-ledger-list-options";
import { moneyLedgerFirstLoadFilterQuery } from "@/lib/money-first-load-filters";
import { MONEY_LEDGER_INVESTMENT } from "@/lib/money-ledger-presets";
import {
  moneyTransactionsListQueryInput,
  moneyTransactionsQueryOptions,
} from "@/lib/money-query-options";

describe("investments ledger SSR / includeTotal parity (P3/P4)", () => {
  it("/investments prefetch omits includeSummary: true", () => {
    const src = readFileSync(
      resolve(process.cwd(), "app/(shell)/investments/page.tsx"),
      "utf8",
    );
    assert.doesNotMatch(src, /includeSummary:\s*true/);
    assert.match(src, /moneyLedgerSsrIncludeSummary/);
  });

  it("MONEY_LEDGER_INVESTMENT SSR/client first-load share includeTotal + filter key", () => {
    const includeTotal = moneyLedgerListIncludeTotal();
    assert.equal(includeTotal, false);
    assert.equal(moneyLedgerSsrIncludeSummary(), false);

    const filterQuery = moneyLedgerFirstLoadFilterQuery(
      MONEY_LEDGER_INVESTMENT,
      [{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", type: "investment" }],
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

  it("investment section uses warm cache without viewport gate when seeded", () => {
    const overview = readFileSync(
      resolve(process.cwd(), "components/investment-overview-page.tsx"),
      "utf8",
    );
    const moneyPage = readFileSync(
      resolve(process.cwd(), "components/money-transactions-page.tsx"),
      "utf8",
    );
    // Prefer explicit false on investments section, or MoneyTransactionsPage
    // override that disables defer when SSR-seeded.
    const overviewDisablesDefer =
      /deferFetchUntilVisible=\{false\}/.test(overview) ||
      /deferLedgerFetchUntilVisible=\{false\}/.test(overview);
    const pageSupportsOverride =
      /deferLedgerFetchUntilVisible/.test(moneyPage) ||
      /deferFetchUntilVisible=\{[^}]*false/.test(moneyPage);
    assert.ok(
      overviewDisablesDefer || pageSupportsOverride,
      "investments section must not wait on IntersectionObserver when SSR seeded",
    );
  });
});
