import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  investmentActivityCashMoveSchema,
  investmentActivityCloseSchema,
  investmentActivityCreateSchema,
  investmentActivityRealizeSchema,
  investmentInstrumentCreateSchema,
} from "@/lib/validators/investment";

const instrumentId = "11111111-1111-4111-8111-111111111111";
const accountId = "44444444-4444-4444-8444-444444444444";
const incomeId = "55555555-5555-4555-8555-555555555555";
const expenseId = "66666666-6666-4666-8666-666666666666";

describe("investmentInstrumentCreateSchema", () => {
  it("requires account and profit/loss categories", () => {
    assert.equal(
      investmentInstrumentCreateSchema.safeParse({
        kind: "fx",
        name: "Gold",
        symbol: "XAUUSD",
        currency: "USD",
      }).success,
      false,
    );
    assert.equal(
      investmentInstrumentCreateSchema.safeParse({
        kind: "commodities",
        symbol: "XAUUSD",
        currency: "USD",
        moneyAccountId: accountId,
        incomeCategoryId: incomeId,
        expenseCategoryId: expenseId,
      }).success,
      true,
    );
    assert.equal(
      investmentInstrumentCreateSchema.safeParse({
        kind: "bonds",
        symbol: "TLT",
        moneyAccountId: accountId,
        incomeCategoryId: incomeId,
        expenseCategoryId: expenseId,
      }).success,
      false,
    );
  });
});

describe("investmentActivityCreateSchema", () => {
  it("accepts buy/sell opens with optional categoryId", () => {
    const parsed = investmentActivityCreateSchema.safeParse({
      instrumentId,
      activityDate: "2026-08-23",
      type: "buy",
      quantity: "1",
      openPrice: "100",
      categoryId: "22222222-2222-4222-8222-222222222222",
    });
    assert.equal(parsed.success, true);
  });

  it("rejects non-positive quantity with a Quantity message", () => {
    const parsed = investmentActivityCreateSchema.safeParse({
      instrumentId,
      activityDate: "2026-08-23",
      type: "buy",
      quantity: "0",
      openPrice: "100",
    });
    assert.equal(parsed.success, false);
    if (!parsed.success) {
      assert.equal(
        parsed.error.issues.some((i) => i.message === "Quantity must be positive"),
        true,
      );
    }
  });

  it("rejects deposit and withdraw", () => {
    assert.equal(
      investmentActivityCreateSchema.safeParse({
        instrumentId,
        activityDate: "2026-08-23",
        type: "deposit",
        amountMinor: 100,
      }).success,
      false,
    );
  });
});

describe("investmentActivityCloseSchema", () => {
  it("requires a positive close price", () => {
    assert.equal(
      investmentActivityCloseSchema.safeParse({
        id: instrumentId,
        closePrice: "0",
      }).success,
      false,
    );
    assert.equal(
      investmentActivityCloseSchema.safeParse({
        id: instrumentId,
        closePrice: "101.5",
        feeMinor: 25,
      }).success,
      true,
    );
  });
});

describe("investmentActivityRealizeSchema", () => {
  it("requires lots, open, close, and type; fee optional", () => {
    assert.equal(
      investmentActivityRealizeSchema.safeParse({
        instrumentId,
        activityDate: "2026-08-23",
        type: "sell",
        quantity: "0.01",
        openPrice: "3400",
        closePrice: "3410",
        priceCurrency: "USD",
        fxRate: 1,
      }).success,
      true,
    );
    assert.equal(
      investmentActivityRealizeSchema.safeParse({
        instrumentId,
        activityDate: "2026-08-23",
        quantity: "0.01",
        openPrice: "3400",
        closePrice: "3410",
      }).success,
      false,
    );
    assert.equal(
      investmentActivityRealizeSchema.safeParse({
        instrumentId,
        activityDate: "2026-08-23",
        type: "buy",
        quantity: "1",
        openPrice: "10",
      }).success,
      false,
    );
  });
});

describe("investmentActivityCashMoveSchema", () => {
  it("requires amount for deposit/withdraw", () => {
    assert.equal(
      investmentActivityCashMoveSchema.safeParse({
        instrumentId,
        activityDate: "2026-08-23",
        type: "deposit",
        amountMinor: 5000,
        feeMinor: 10,
      }).success,
      true,
    );
    assert.equal(
      investmentActivityCashMoveSchema.safeParse({
        instrumentId,
        activityDate: "2026-08-23",
        type: "withdraw",
        amountMinor: 0,
      }).success,
      false,
    );
  });
});
