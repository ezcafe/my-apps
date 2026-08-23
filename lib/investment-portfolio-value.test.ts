import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computePortfolioValueSeries } from "@/lib/investment-portfolio-value";

describe("computePortfolioValueSeries", () => {
  const inst = { id: "gold", contractSize: "100", currency: "USD" };

  it("adds realized P&L after the close date", () => {
    const series = computePortfolioValueSeries({
      from: "2026-08-01",
      to: "2026-08-03",
      lots: [
        {
          instrumentId: "gold",
          side: "buy",
          quantity: 0.01,
          openPrice: 3400,
          openDate: "2026-08-01",
          closeDate: "2026-08-02",
          realizedPnlMinor: 1500,
        },
      ],
      instruments: [inst],
      dailyByInst: new Map([
        [
          "gold",
          [
            { date: "2026-08-01", closePriceMinor: 341000 },
            { date: "2026-08-02", closePriceMinor: 342000 },
          ],
        ],
      ]),
      latestByInst: new Map([["gold", 342000]]),
      workspaceCurrency: "USD",
      fxRateToWorkspace: new Map(),
    });
    assert.equal(series.length, 3);
    // Open: (3410-3400)*0.01*100 = 10 USD = 1000 minor
    assert.equal(series[0]?.totalMinor, 1000);
    // Closed: booked +15.00
    assert.equal(series[1]?.totalMinor, 1500);
    assert.equal(series[2]?.totalMinor, 1500);
  });

  it("marks open shorts to market", () => {
    const series = computePortfolioValueSeries({
      from: "2026-08-10",
      to: "2026-08-10",
      lots: [
        {
          instrumentId: "gold",
          side: "sell",
          quantity: 0.01,
          openPrice: 3400,
          openDate: "2026-08-01",
          closeDate: null,
          realizedPnlMinor: 0,
        },
      ],
      instruments: [inst],
      dailyByInst: new Map([
        ["gold", [{ date: "2026-08-10", closePriceMinor: 339000 }]],
      ]),
      latestByInst: new Map([["gold", 339000]]),
      workspaceCurrency: "USD",
      fxRateToWorkspace: new Map(),
    });
    // (3400-3390)*0.01*100 = 10 USD
    assert.equal(series[0]?.totalMinor, 1000);
  });
});
