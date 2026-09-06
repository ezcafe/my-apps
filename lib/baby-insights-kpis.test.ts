import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveBabyInsightsKpis } from "@/lib/baby-insights-kpis";

describe("deriveBabyInsightsKpis", () => {
  it("counts care types and latest weight", () => {
    const kpis = deriveBabyInsightsKpis({
      timeline: [
        { kind: "care", type: "feed" },
        { kind: "care", type: "feed" },
        { kind: "care", type: "sleep" },
        { kind: "care", type: "diaper" },
        { kind: "growth", type: "weight" },
      ],
      growth: [
        { kind: "weight", valueNum: 4.2, unit: "kg" },
        { kind: "height", valueNum: 55, unit: "cm" },
      ],
    });
    assert.deepEqual(kpis, {
      feeds: 2,
      sleep: 1,
      diapers: 1,
      latestWeight: { valueNum: 4.2, unit: "kg" },
    });
  });

  it("respects care chip filter for counts", () => {
    const kpis = deriveBabyInsightsKpis(
      {
        timeline: [
          { kind: "care", type: "feed" },
          { kind: "care", type: "diaper" },
        ],
        growth: [],
      },
      ["feed"],
    );
    assert.equal(kpis.feeds, 1);
    assert.equal(kpis.diapers, 0);
  });

  it("skips weight rows with null valueNum", () => {
    const kpis = deriveBabyInsightsKpis({
      timeline: [],
      growth: [
        { kind: "weight", valueNum: null, unit: "kg" },
        { kind: "weight", valueNum: 3.9, unit: "kg" },
      ],
    });
    assert.deepEqual(kpis.latestWeight, { valueNum: 3.9, unit: "kg" });
  });

  it("takes newest-first weight when multiple weights exist", () => {
    const kpis = deriveBabyInsightsKpis({
      timeline: [],
      growth: [
        { kind: "weight", valueNum: 4.5, unit: "kg" },
        { kind: "weight", valueNum: 4.0, unit: "kg" },
      ],
    });
    assert.deepEqual(kpis.latestWeight, { valueNum: 4.5, unit: "kg" });
  });

  it("care chip filter must not clear latestWeight", () => {
    const kpis = deriveBabyInsightsKpis(
      {
        timeline: [
          { kind: "care", type: "feed" },
          { kind: "care", type: "diaper" },
        ],
        growth: [{ kind: "weight", valueNum: 4.2, unit: "kg" }],
      },
      ["feed"],
    );
    assert.equal(kpis.feeds, 1);
    assert.equal(kpis.diapers, 0);
    assert.deepEqual(kpis.latestWeight, { valueNum: 4.2, unit: "kg" });
  });

  it("returns zero and null when empty", () => {
    const kpis = deriveBabyInsightsKpis({ timeline: [], growth: [] });
    assert.deepEqual(kpis, {
      feeds: 0,
      sleep: 0,
      diapers: 0,
      latestWeight: null,
    });
  });
});
