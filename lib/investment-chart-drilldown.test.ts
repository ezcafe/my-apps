import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  investmentDrilldownForDate,
  investmentDrilldownForKind,
  resolveInstrumentIdBySymbol,
} from "@/lib/investment-chart-drilldown";

describe("investment chart drilldown", () => {
  it("maps kind click to activities query", () => {
    const payload = investmentDrilldownForKind({
      kindLabel: "stock",
      from: "2026-01-01",
      to: "2026-09-30",
    });
    assert.equal(payload.query.kind, "stock");
    assert.equal(payload.query.from, "2026-01-01");
  });

  it("maps date click to same-day range", () => {
    const payload = investmentDrilldownForDate({ date: "2026-09-15" });
    assert.equal(payload.query.from, "2026-09-15");
    assert.equal(payload.query.to, "2026-09-15");
  });

  it("strips time from ISO date keys for activities query", () => {
    const payload = investmentDrilldownForDate({
      date: "2026-09-15T00:00:00.000Z",
    });
    assert.equal(payload.query.from, "2026-09-15");
    assert.equal(payload.query.to, "2026-09-15");
  });

  it("resolves symbol to instrumentId", () => {
    assert.equal(
      resolveInstrumentIdBySymbol(
        [
          { id: "a", symbol: "VNM" },
          { id: "b", symbol: "FPT" },
        ],
        "fpt",
      ),
      "b",
    );
    assert.equal(
      resolveInstrumentIdBySymbol([{ id: "a", symbol: "VNM" }], "XXX"),
      undefined,
    );
  });
});
