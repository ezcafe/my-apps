import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findSeedBillsCategoryId,
  findSeedFinancialFreedomCategoryId,
  findSeedLoansCategoryId,
  findSystemAccountId,
  MONEY_SEED_BILLS,
  MONEY_SEED_FINANCIAL_FREEDOM,
  MONEY_SEED_LOANS,
  MONEY_SEED_NECESSITIES,
  MONEY_SYSTEM_ACCOUNT_KEYS,
  MONEY_SYSTEM_ACCOUNT_SEEDS,
  preferredExpenseCategoryIdForAccountType,
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

describe("findSeedLoansCategoryId", () => {
  it("returns Loans under Necessities", () => {
    const categories = [
      { id: "n1", name: MONEY_SEED_NECESSITIES, parentId: null },
      { id: "l1", name: MONEY_SEED_LOANS, parentId: "n1" },
      { id: "b1", name: MONEY_SEED_BILLS, parentId: "n1" },
    ];
    assert.equal(findSeedLoansCategoryId(categories), "l1");
  });

  it("returns undefined when Loans is missing", () => {
    const categories = [
      { id: "n1", name: MONEY_SEED_NECESSITIES, parentId: null },
    ];
    assert.equal(findSeedLoansCategoryId(categories), undefined);
  });
});

describe("findSeedFinancialFreedomCategoryId", () => {
  it("returns the Financial Freedom root", () => {
    const categories = [
      { id: "ff", name: MONEY_SEED_FINANCIAL_FREEDOM, parentId: null },
      { id: "n1", name: MONEY_SEED_NECESSITIES, parentId: null },
    ];
    assert.equal(findSeedFinancialFreedomCategoryId(categories), "ff");
  });
});

describe("preferredExpenseCategoryIdForAccountType", () => {
  const categories = [
    { id: "ff", name: MONEY_SEED_FINANCIAL_FREEDOM, parentId: null },
    { id: "n1", name: MONEY_SEED_NECESSITIES, parentId: null },
    { id: "l1", name: MONEY_SEED_LOANS, parentId: "n1" },
  ];

  it("maps investment and savings to Financial Freedom", () => {
    assert.equal(
      preferredExpenseCategoryIdForAccountType("investment", categories),
      "ff",
    );
    assert.equal(
      preferredExpenseCategoryIdForAccountType("savings", categories),
      "ff",
    );
  });

  it("maps loan to Loans under Necessities", () => {
    assert.equal(
      preferredExpenseCategoryIdForAccountType("loan", categories),
      "l1",
    );
  });

  it("returns undefined for other account types", () => {
    assert.equal(
      preferredExpenseCategoryIdForAccountType("checking", categories),
      undefined,
    );
    assert.equal(
      preferredExpenseCategoryIdForAccountType("credit", categories),
      undefined,
    );
  });
});

describe("findSystemAccountId", () => {
  it("returns the Loans system account id", () => {
    const accounts = [
      { id: "a-check", systemKey: null },
      { id: "a-loan", systemKey: "loan" },
    ];
    assert.equal(findSystemAccountId(accounts, "loan"), "a-loan");
  });

  it("returns undefined when the system account is missing", () => {
    assert.equal(
      findSystemAccountId([{ id: "a-check", systemKey: null }], "loan"),
      undefined,
    );
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
