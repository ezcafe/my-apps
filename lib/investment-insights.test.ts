import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allocationByKind,
  closedTradeHitRate,
  maxDrawdownMinor,
  openLotsCount,
  pnlBySymbol,
  realizedPnlMinor,
} from "@/lib/investment-insights";

describe("investment insights aggregations", () => {
  it("groups allocation by kind and sorts by notional", () => {
    assert.deepEqual(
      allocationByKind([
        { kind: "stocks", valueMinor: 100 },
        { kind: "fx", valueMinor: 50 },
        { kind: "stocks", valueMinor: 25 },
        { kind: "coins", valueMinor: 0 },
      ]),
      [
        { kind: "stocks", label: "Stocks", valueMinor: 125 },
        { kind: "fx", label: "FX", valueMinor: 50 },
      ],
    );
  });

  it("sums realized P&L on closed lots only", () => {
    assert.equal(
      realizedPnlMinor([
        { closeDate: "2026-01-02", realizedPnlMinor: 1500 },
        { closeDate: null, realizedPnlMinor: 0 },
        { closeDate: "2026-02-01", realizedPnlMinor: -200 },
      ]),
      1300,
    );
    assert.equal(openLotsCount([{ closeDate: null }, { closeDate: "2026-01-01" }]), 1);
  });

  it("computes peak-to-trough drawdown on the results series", () => {
    assert.equal(
      maxDrawdownMinor([
        { totalMinor: 100 },
        { totalMinor: 150 },
        { totalMinor: 80 },
        { totalMinor: 120 },
      ]),
      70,
    );
  });

  it("counts winning closed lots for hit rate", () => {
    assert.deepEqual(
      closedTradeHitRate([
        { closeDate: "2026-01-01", realizedPnlMinor: 10 },
        { closeDate: "2026-01-02", realizedPnlMinor: -5 },
        { closeDate: null, realizedPnlMinor: 99 },
        { closeDate: "2026-01-03", realizedPnlMinor: 0 },
      ]),
      { closedCount: 3, winningClosedCount: 1 },
    );
  });

  it("rolls P&L by symbol", () => {
    assert.deepEqual(
      pnlBySymbol([
        { symbol: "AAPL", name: "Apple", pnlMinor: 10 },
        { symbol: "AAPL", name: "Apple", pnlMinor: -3 },
        { symbol: "EURUSD", name: "Euro", pnlMinor: 20 },
      ]),
      [
        { symbol: "EURUSD", label: "Euro", valueMinor: 20 },
        { symbol: "AAPL", label: "Apple", valueMinor: 7 },
      ],
    );
  });
});
