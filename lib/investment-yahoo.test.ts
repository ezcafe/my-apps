import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultYahooSymbol } from "@/lib/investment-yahoo";

describe("defaultYahooSymbol", () => {
  it("uses the ticker for stocks and commodities", () => {
    assert.equal(defaultYahooSymbol("stocks", "aapl", "USD"), "AAPL");
    assert.equal(defaultYahooSymbol("commodities", "gc=f", "USD"), "GC=F");
  });

  it("appends currency for coins and =X for fx", () => {
    assert.equal(defaultYahooSymbol("coins", "BTC", "USD"), "BTC-USD");
    assert.equal(defaultYahooSymbol("fx", "EURUSD", "USD"), "EURUSD=X");
  });
});
