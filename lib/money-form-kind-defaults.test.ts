import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  expenseCategoryKindForFormKind,
  moneyNewHref,
  parseInstrumentId,
  parseMoneyFormKind,
  preferredAccountIdForFormKind,
  preferredCategoryIdForFormKind,
} from "@/lib/money-form-kind-defaults";
import {
  MONEY_SEED_FINANCIAL_FREEDOM,
  MONEY_SEED_LOANS,
  MONEY_SEED_NECESSITIES,
} from "@/lib/money-seed-defaults";

describe("parseMoneyFormKind", () => {
  it("accepts known kinds and rejects junk", () => {
    assert.equal(parseMoneyFormKind("investment"), "investment");
    assert.equal(parseMoneyFormKind("loan"), "loan");
    assert.equal(parseMoneyFormKind("expense"), "expense");
    assert.equal(parseMoneyFormKind("nope"), null);
    assert.equal(parseMoneyFormKind(null), null);
  });
});

describe("parseInstrumentId", () => {
  it("accepts a UUID and rejects other strings", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    assert.equal(parseInstrumentId(id), id);
    assert.equal(parseInstrumentId("not-a-uuid"), null);
    assert.equal(parseInstrumentId(""), null);
  });
});

describe("moneyNewHref", () => {
  it("round-trips kind and instrumentId", () => {
    assert.equal(moneyNewHref(), "/money/new");
    assert.equal(
      moneyNewHref({ kind: "investment" }),
      "/money/new?kind=investment",
    );
    const id = "11111111-1111-4111-8111-111111111111";
    assert.equal(
      moneyNewHref({ kind: "investment", instrumentId: id }),
      `/money/new?kind=investment&instrumentId=${id}`,
    );
  });
});

describe("preferredAccountIdForFormKind", () => {
  const accounts = [
    { id: "cash", type: "checking", systemKey: null },
    { id: "inv", type: "investment", systemKey: "investment" },
    { id: "ln", type: "loan", systemKey: "loan" },
  ];

  it("resolves system investment and loan accounts", () => {
    assert.equal(preferredAccountIdForFormKind("investment", accounts), "inv");
    assert.equal(preferredAccountIdForFormKind("loan", accounts), "ln");
    assert.equal(preferredAccountIdForFormKind("expense", accounts), undefined);
  });

  it("falls back to account type when systemKey is missing", () => {
    assert.equal(
      preferredAccountIdForFormKind("investment", [
        { id: "inv2", type: "investment", systemKey: null },
      ]),
      "inv2",
    );
  });
});

describe("preferredCategoryIdForFormKind", () => {
  const necessities = {
    id: "nec",
    name: MONEY_SEED_NECESSITIES,
    parentId: null,
  };
  const loans = {
    id: "loans-cat",
    name: MONEY_SEED_LOANS,
    parentId: "nec",
  };
  const ff = {
    id: "ff",
    name: MONEY_SEED_FINANCIAL_FREEDOM,
    parentId: null,
  };

  it("picks Financial Freedom and Loans seed categories", () => {
    const cats = [necessities, loans, ff];
    assert.equal(preferredCategoryIdForFormKind("investment", cats), "ff");
    assert.equal(preferredCategoryIdForFormKind("loan", cats), "loans-cat");
    assert.equal(preferredCategoryIdForFormKind("expense", cats), undefined);
  });

  it("returns undefined when seeds are missing", () => {
    assert.equal(preferredCategoryIdForFormKind("investment", []), undefined);
    assert.equal(preferredCategoryIdForFormKind("loan", [necessities]), undefined);
  });
});

describe("expenseCategoryKindForFormKind", () => {
  it("maps capture kinds to category buckets", () => {
    assert.equal(expenseCategoryKindForFormKind("investment"), "expense");
    assert.equal(expenseCategoryKindForFormKind("loan"), "expense");
    assert.equal(expenseCategoryKindForFormKind("income"), "income");
    assert.equal(expenseCategoryKindForFormKind("transfer"), null);
  });
});
