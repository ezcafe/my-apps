import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  babyMeasureKindFilter,
  isBabyGrowthKindChip,
  selectBabyGrowthKindChip,
} from "@/lib/baby-growth-kind-chips";

describe("selectBabyGrowthKindChip", () => {
  it("sets the clicked kind", () => {
    assert.equal(selectBabyGrowthKindChip("weight", "height"), "height");
    assert.equal(selectBabyGrowthKindChip("height", "height"), "height");
  });
});

describe("isBabyGrowthKindChip", () => {
  it("accepts the five growth kinds", () => {
    assert.equal(isBabyGrowthKindChip("head"), true);
    assert.equal(isBabyGrowthKindChip("feed"), false);
  });
});

describe("babyMeasureKindFilter", () => {
  it("keeps only the selected kind", () => {
    const rows = [
      { kind: "weight" },
      { kind: "height" },
      { kind: "weight" },
    ];
    assert.deepEqual(babyMeasureKindFilter(rows, "weight"), [
      { kind: "weight" },
      { kind: "weight" },
    ]);
  });

  it("preserves full growth row fields (id, valueNum, unit, recordedAt)", () => {
    const rows = [
      {
        id: "g1",
        kind: "weight",
        recordedAt: "2026-09-01T00:00:00.000Z",
        valueNum: 4.2,
        valueText: null,
        unit: "kg",
        notes: null,
      },
      {
        id: "g2",
        kind: "height",
        recordedAt: "2026-09-02T00:00:00.000Z",
        valueNum: 55,
        valueText: null,
        unit: "cm",
        notes: null,
      },
    ];
    const visible = babyMeasureKindFilter(rows, "weight");
    assert.equal(visible.length, 1);
    assert.equal(visible[0]!.id, "g1");
    assert.equal(visible[0]!.valueNum, 4.2);
    assert.equal(visible[0]!.unit, "kg");
    assert.equal(visible[0]!.recordedAt, "2026-09-01T00:00:00.000Z");
  });
});
