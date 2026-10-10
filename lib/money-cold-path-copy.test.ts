import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  MONEY_COLD_FORM_EMPTY,
  MONEY_COLD_INSIGHTS_SPEND_EMPTY,
  MONEY_COLD_INSIGHTS_TRANSACTIONS_EMPTY,
  MONEY_COLD_LEDGER_BILLS_EMPTY,
  MONEY_COLD_LEDGER_SAVINGS_EMPTY,
  MONEY_COLD_LEDGER_SPENDING_EMPTY,
} from "@/lib/money-cold-path-copy";

function mentionsAddOrTransaction(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes("add") || lower.includes("transaction");
}

describe("money-cold-path-copy", () => {
  it("spendingEmpty_actionFirst", () => {
    assert.ok(MONEY_COLD_LEDGER_SPENDING_EMPTY.title.trim().length > 0);
    assert.ok(MONEY_COLD_LEDGER_SPENDING_EMPTY.description.trim().length > 0);
    assert.ok(
      mentionsAddOrTransaction(MONEY_COLD_LEDGER_SPENDING_EMPTY.description),
    );
    assert.match(
      MONEY_COLD_LEDGER_SPENDING_EMPTY.description.toLowerCase(),
      /range|filter/,
    );
  });

  it("billsAndSavingsEmpty_nonEmptyActionFirst", () => {
    assert.ok(mentionsAddOrTransaction(MONEY_COLD_LEDGER_BILLS_EMPTY.description));
    assert.ok(
      MONEY_COLD_LEDGER_SAVINGS_EMPTY.description.toLowerCase().includes("transfer") ||
        mentionsAddOrTransaction(MONEY_COLD_LEDGER_SAVINGS_EMPTY.description),
    );
  });

  it("formAccountEmpty_mentionsSettingsAccounts", () => {
    const msg = MONEY_COLD_FORM_EMPTY.accounts;
    assert.match(msg.toLowerCase(), /settings/);
    assert.match(msg.toLowerCase(), /account/);
  });

  it("insightsFallback_mentionsAddOrTransaction", () => {
    assert.ok(
      mentionsAddOrTransaction(MONEY_COLD_INSIGHTS_TRANSACTIONS_EMPTY.description),
    );
    assert.ok(
      mentionsAddOrTransaction(MONEY_COLD_INSIGHTS_SPEND_EMPTY.description),
    );
  });
});

describe("money-cold-path-copy wiring", () => {
  it("presetsAndCallSites_useColdPathModule", () => {
    const root = process.cwd();
    const presets = readFileSync(
      join(root, "lib/money-ledger-presets.ts"),
      "utf8",
    );
    const table = readFileSync(
      join(root, "components/analytics-transactions-table.tsx"),
      "utf8",
    );
    const spend = readFileSync(
      join(root, "components/analytics-chart-cards/spend-by-category-card.tsx"),
      "utf8",
    );
    const form = readFileSync(
      join(root, "components/money-transaction-form.tsx"),
      "utf8",
    );
    assert.match(presets, /money-cold-path-copy/);
    assert.match(presets, /MONEY_COLD_LEDGER_SPENDING_EMPTY/);
    assert.match(table, /money-cold-path-copy/);
    assert.match(spend, /money-cold-path-copy/);
    assert.match(form, /money-cold-path-copy/);
  });

  it("task1_kioskMeasuredAndBabyPrunePresent", () => {
    const root = process.cwd();
    const perf = readFileSync(join(root, "docs/PERFORMANCE.md"), "utf8");
    const prune = readFileSync(
      join(root, "lib/baby-quick-care-prune.ts"),
      "utf8",
    );
    const house = readFileSync(join(root, "lib/db-housekeeping.ts"), "utf8");
    assert.match(perf, /\/kiosk/);
    assert.doesNotMatch(perf, /\|\s*`\/kiosk`\s*\|\s*\(measure after change\)/);
    assert.match(prune, /pruneExpiredBabyQuickCareRequests/);
    assert.match(house, /pruneExpiredBabyQuickCareRequests/);
  });
});
