import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  convertSignedMajorToMinor,
  convertSignedMinor,
  isPriceCurrency,
  yahooFxSymbol,
} from "@/lib/investment-fx";

describe("yahooFxSymbol", () => {
  it("builds a Yahoo FX pair", () => {
    assert.equal(yahooFxSymbol("usd", "vnd"), "USDVND=X");
  });
});

describe("isPriceCurrency", () => {
  it("accepts the workspace currency list", () => {
    assert.equal(isPriceCurrency("USD"), true);
    assert.equal(isPriceCurrency("CAD"), false);
  });
});

describe("convertSignedMajorToMinor", () => {
  it("keeps fractional USD P&L until converting to VND", () => {
    assert.equal(
      convertSignedMajorToMinor({
        fromMajor: 0.00005,
        fromCurrency: "USD",
        toCurrency: "VND",
        rateToPerFrom: 25000,
      }),
      1,
    );
  });

  it("rounds same-currency VND dust to 0 dong", () => {
    assert.equal(
      convertSignedMajorToMinor({
        fromMajor: -0.00005,
        fromCurrency: "VND",
        toCurrency: "VND",
        rateToPerFrom: 1,
      }),
      0,
    );
  });
});

describe("convertSignedMinor", () => {
  it("is a no-op when currencies match", () => {
    assert.equal(
      convertSignedMinor({
        fromMinor: 1250,
        fromCurrency: "USD",
        toCurrency: "USD",
        rateToPerFrom: 99,
      }),
      1250,
    );
  });

  it("converts USD cents to VND at the given rate", () => {
    assert.equal(
      convertSignedMinor({
        fromMinor: 100,
        fromCurrency: "USD",
        toCurrency: "VND",
        rateToPerFrom: 25000,
      }),
      25000,
    );
  });

  it("preserves sign for losses", () => {
    assert.equal(
      convertSignedMinor({
        fromMinor: -100,
        fromCurrency: "USD",
        toCurrency: "VND",
        rateToPerFrom: 25000,
      }),
      -25000,
    );
  });
});
