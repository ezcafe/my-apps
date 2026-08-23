import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INVESTMENT_INSTRUMENT_KINDS,
  investmentInstrumentKindLabel,
  isInvestmentInstrumentKind,
} from "@/lib/investment-instrument-kind";

describe("investmentInstrumentKindLabel", () => {
  it("uses Stocks / Fx / Coins / Commodities", () => {
    assert.equal(investmentInstrumentKindLabel("stocks"), "Stocks");
    assert.equal(investmentInstrumentKindLabel("fx"), "Fx");
    assert.equal(investmentInstrumentKindLabel("coins"), "Coins");
    assert.equal(investmentInstrumentKindLabel("commodities"), "Commodities");
  });

  it("lists kinds in chip order", () => {
    assert.deepEqual([...INVESTMENT_INSTRUMENT_KINDS], [
      "stocks",
      "fx",
      "coins",
      "commodities",
    ]);
  });

  it("guards unknown values", () => {
    assert.equal(isInvestmentInstrumentKind("fx"), true);
    assert.equal(isInvestmentInstrumentKind("commodity"), false);
  });
});
