import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findSeedBillsCategoryId,
  MONEY_SEED_BILLS,
  MONEY_SEED_NECESSITIES,
  MONEY_SYSTEM_ACCOUNT_KEYS,
  MONEY_SYSTEM_ACCOUNT_SEEDS,
  systemAccountSeedsToCreate,
} from "./money-seed-defaults";

describe("findSeedBillsCategoryId", () => {
  it("returns Bills under Necessities", () => {
    const categories = [
      { id: "n1", name: MONEY_SEED_NECESSITIES, parentId: null },
      { id: "b1", name: MONEY_SEED_BILLS, parentId: "n1" },
      { id: "x1", name: "Food & Drink", parentId: "n1" },
    ];
    assert.equal(findSeedBillsCategoryId(categories), "b1");
  });

  it("returns undefined when Bills is missing", () => {
    const categories = [
      { id: "n1", name: MONEY_SEED_NECESSITIES, parentId: null },
    ];
    assert.equal(findSeedBillsCategoryId(categories), undefined);
  });
});

describe("MONEY_SYSTEM_ACCOUNT_SEEDS", () => {
  it("covers each system key exactly once with matching type", () => {
    assert.deepEqual(
      MONEY_SYSTEM_ACCOUNT_SEEDS.map((s) => s.systemKey),
      [...MONEY_SYSTEM_ACCOUNT_KEYS],
    );
    for (const seed of MONEY_SYSTEM_ACCOUNT_SEEDS) {
      assert.equal(seed.type, seed.systemKey);
    }
  });

  it("uses ledger-aligned display names", () => {
    const byKey = Object.fromEntries(
      MONEY_SYSTEM_ACCOUNT_SEEDS.map((s) => [s.systemKey, s.name]),
    );
    assert.deepEqual(byKey, {
      credit: "Credit Card",
      savings: "Savings",
      investment: "Investments",
      loan: "Loans",
    });
  });

  it("systemAccountSeedsToCreate is idempotent by systemKey", () => {
    assert.equal(
      systemAccountSeedsToCreate(new Set(MONEY_SYSTEM_ACCOUNT_KEYS)).length,
      0,
    );
    const partial = systemAccountSeedsToCreate(new Set(["credit", "savings"]));
    assert.deepEqual(
      partial.map((s) => s.systemKey),
      ["investment", "loan"],
    );
    // Name collisions do not count — only systemKey
    assert.equal(systemAccountSeedsToCreate(new Set()).length, 4);
  });
});
