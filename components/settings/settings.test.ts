import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  filterSettingsCategories,
  SETTINGS_CATEGORIES,
  MONEY_SETTINGS_CATEGORIES,
  INVESTMENT_SETTINGS_CATEGORIES,
  LOANS_SETTINGS_CATEGORIES,
} from "./settings-types";

describe("Settings search and category filtering", () => {
  it("returns all categories when query is empty", () => {
    const { matchingCategories, matchCounts } = filterSettingsCategories("", SETTINGS_CATEGORIES);
    assert.equal(matchingCategories.length, SETTINGS_CATEGORIES.length);
    assert.deepEqual(matchCounts, {});
  });

  it("filters by category label (e.g. Appearance)", () => {
    const { matchingCategories } = filterSettingsCategories("appearance", SETTINGS_CATEGORIES);
    assert.equal(matchingCategories.length, 1);
    assert.equal(matchingCategories[0].id, "appearance");
  });

  it("filters by category keywords (e.g. dark mode -> appearance)", () => {
    const { matchingCategories } = filterSettingsCategories("dark", SETTINGS_CATEGORIES);
    assert.equal(matchingCategories.length, 1);
    assert.equal(matchingCategories[0].id, "appearance");
  });

  it("filters by description words (e.g. bearer -> api-tokens)", () => {
    const { matchingCategories } = filterSettingsCategories("bearer", SETTINGS_CATEGORIES);
    assert.equal(matchingCategories.length, 1);
    assert.equal(matchingCategories[0].id, "api-tokens");
  });

  it("filters danger zone keywords (e.g. wipe / reset)", () => {
    const { matchingCategories } = filterSettingsCategories("wipe", SETTINGS_CATEGORIES);
    assert.equal(matchingCategories.length, 1);
    assert.equal(matchingCategories[0].id, "danger-zone");
  });

  it("returns empty matches when query matches nothing", () => {
    const { matchingCategories, matchCounts } = filterSettingsCategories(
      "nonexistent_random_term_xyz",
      SETTINGS_CATEGORIES,
    );
    assert.equal(matchingCategories.length, 0);
    assert.equal(matchCounts.appearance, 0);
  });

  it("filters Money settings categories by keywords (e.g. budgets, recurrence, bills)", () => {
    const resBudgets = filterSettingsCategories("budgets", MONEY_SETTINGS_CATEGORIES);
    assert.equal(resBudgets.matchingCategories.length, 2); // ledger & clone mention budgets

    const resRecurrence = filterSettingsCategories("recurrence", MONEY_SETTINGS_CATEGORIES);
    assert.equal(resRecurrence.matchingCategories.length, 2); // ledger & clone mention recurrence

    const resBills = filterSettingsCategories("bills", MONEY_SETTINGS_CATEGORIES);
    assert.equal(resBills.matchingCategories.length, 1);
    assert.equal(resBills.matchingCategories[0].id, "menu");
  });

  it("filters Investment settings categories by keywords (e.g. ctrader, binance, quotes, currency)", () => {
    const resCtrader = filterSettingsCategories("ctrader", INVESTMENT_SETTINGS_CATEGORIES);
    assert.equal(resCtrader.matchingCategories.length, 1);
    assert.equal(resCtrader.matchingCategories[0].id, "import");

    const resYahoo = filterSettingsCategories("yahoo", INVESTMENT_SETTINGS_CATEGORIES);
    assert.equal(resYahoo.matchingCategories.length, 1);
    assert.equal(resYahoo.matchingCategories[0].id, "instruments");

    const resCurrency = filterSettingsCategories("currency", INVESTMENT_SETTINGS_CATEGORIES);
    assert.equal(resCurrency.matchingCategories.length, 1);
    assert.equal(resCurrency.matchingCategories[0].id, "ledger");
  });

  it("filters Loans settings categories by keywords (e.g. reminders, push, due)", () => {
    const resPush = filterSettingsCategories("push", LOANS_SETTINGS_CATEGORIES);
    assert.equal(resPush.matchingCategories.length, 1);
    assert.equal(resPush.matchingCategories[0].id, "notifications");

    const resInstallments = filterSettingsCategories("installment", LOANS_SETTINGS_CATEGORIES);
    assert.equal(resInstallments.matchingCategories.length, 1);
    assert.equal(resInstallments.matchingCategories[0].id, "notifications");
  });
});
