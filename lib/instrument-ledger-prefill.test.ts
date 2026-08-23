import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { instrumentLedgerPrefill } from "@/lib/instrument-ledger-prefill";

const accountId = "11111111-1111-4111-8111-111111111111";
const incomeId = "22222222-2222-4222-8222-222222222222";
const expenseId = "33333333-3333-4333-8333-333333333333";

describe("instrumentLedgerPrefill", () => {
  const defaults = {
    moneyAccountId: accountId,
    incomeCategoryId: incomeId,
    expenseCategoryId: expenseId,
  };

  it("returns only account before P&L is known", () => {
    assert.deepEqual(instrumentLedgerPrefill(defaults, null), {
      accountId,
    });
  });

  it("picks income category on profit", () => {
    assert.deepEqual(instrumentLedgerPrefill(defaults, 12), {
      accountId,
      categoryId: incomeId,
    });
  });

  it("picks expense category on loss", () => {
    assert.deepEqual(instrumentLedgerPrefill(defaults, -0.00005), {
      accountId,
      categoryId: expenseId,
    });
  });

  it("ignores missing defaults", () => {
    assert.deepEqual(instrumentLedgerPrefill(null, 1), {});
  });
});
