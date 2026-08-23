import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultContractSize,
  holdingValueMinor,
  parseContractSize,
} from "@/lib/investment-contract-size";
import { quantityDelta } from "@/lib/investment-services/positions";
import {
  investmentActivityCreateSchema,
  investmentActivityTypeSchema,
} from "@/lib/validators/investment";

describe("defaultContractSize", () => {
  it("uses IC Markets lot sizes", () => {
    assert.equal(defaultContractSize("stocks", "AAPL"), "1");
    assert.equal(defaultContractSize("coins", "BTC"), "1");
    assert.equal(defaultContractSize("fx", "XAUUSD"), "100");
    assert.equal(defaultContractSize("fx", "XAGUSD"), "1000");
    assert.equal(defaultContractSize("commodities", "XAUUSD"), "100");
    assert.equal(defaultContractSize("commodities", "WTI"), "1");
  });
});

describe("holdingValueMinor", () => {
  it("values 0.01 XAUUSD lots at 1 oz", () => {
    const priceMinor = 340012;
    assert.equal(
      holdingValueMinor(0.01, parseContractSize("100"), priceMinor),
      Math.round(0.01 * 100 * 340012),
    );
  });
});

describe("quantityDelta historical types", () => {
  it("still applies fee and adjustment for existing rows", () => {
    assert.equal(quantityDelta("fee", 2), -2);
    assert.equal(quantityDelta("adjustment", 3), 3);
    assert.equal(quantityDelta("dividend", 10), 0);
    assert.equal(quantityDelta("deposit", 0.01), 0.01);
    assert.equal(quantityDelta("withdraw", 0.01), -0.01);
  });
});

describe("investmentActivityCreateSchema", () => {
  const base = {
    instrumentId: "00000000-0000-4000-8000-000000000001",
    activityDate: "2026-08-22",
  };

  it("rejects dividend fee and adjustment", () => {
    for (const type of ["dividend", "fee", "adjustment"] as const) {
      assert.equal(investmentActivityTypeSchema.safeParse(type).success, true);
      assert.equal(
        investmentActivityCreateSchema.safeParse({
          ...base,
          type,
          quantity: "0.01",
          openPrice: "3400.12",
          amountMinor: 4,
        }).success,
        false,
      );
    }
  });

  it("rejects deposit and withdraw on open schema", () => {
    assert.equal(
      investmentActivityCreateSchema.safeParse({
        ...base,
        type: "deposit",
        amountMinor: 10000,
      }).success,
      false,
    );
  });

  it("requires volume and open price for buy", () => {
    assert.equal(
      investmentActivityCreateSchema.safeParse({
        ...base,
        type: "buy",
        amountMinor: 0,
      }).success,
      false,
    );
    assert.equal(
      investmentActivityCreateSchema.safeParse({
        ...base,
        type: "buy",
        quantity: "0.01",
        openPrice: "3400.12",
        amountMinor: 0,
      }).success,
      true,
    );
  });
});
