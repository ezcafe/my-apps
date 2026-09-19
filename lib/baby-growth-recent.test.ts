import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BABY_GROWTH_RECENT_LIMIT,
  buildBabyGrowthUpdateInput,
  formatGrowthSummary,
  growthMedNameSaveBlocked,
  growthVaccineCreateInput,
  growthVaccineSaveBlocked,
  mergeBabyGrowthRecentEntries,
} from "@/lib/baby-growth-recent";

describe("mergeBabyGrowthRecentEntries", () => {
  it("merges by time and takes top N=50", () => {
    const growth = Array.from({ length: 40 }, (_, i) => ({
      id: `g${i}`,
      kind: "weight",
      recordedAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
      valueNum: i,
      unit: "kg",
    }));
    const vaccines = Array.from({ length: 40 }, (_, i) => ({
      id: `v${i}`,
      name: `Vax${i}`,
      dose: "first" as const,
      administeredAt: new Date(Date.UTC(2026, 0, 1, 12, i)).toISOString(),
    }));
    const merged = mergeBabyGrowthRecentEntries(growth, vaccines);
    assert.equal(merged.length, BABY_GROWTH_RECENT_LIMIT);
    assert.equal(merged[0]!.source, "vaccine");
    assert.ok(merged.some((r) => r.source === "growth"));
    assert.ok(merged.some((r) => r.source === "vaccine"));
  });

  it("sorts newer first across sources", () => {
    const merged = mergeBabyGrowthRecentEntries(
      [
        {
          id: "g1",
          kind: "weight",
          recordedAt: "2026-01-01T10:00:00.000Z",
          valueNum: 4,
          unit: "kg",
        },
      ],
      [
        {
          id: "v1",
          name: "Hexaxim",
          dose: "first",
          administeredAt: "2026-01-01T12:00:00.000Z",
        },
      ],
    );
    assert.equal(merged[0]!.id, "v1");
    assert.equal(merged[1]!.id, "g1");
  });
});

describe("growthVaccineCreateInput", () => {
  it("maps name, dose, administeredAt", () => {
    const mapped = growthVaccineCreateInput({
      name: " Hexaxim ",
      dose: "second",
      administeredAt: "2026-01-01T00:00:00.000Z",
    });
    assert.deepEqual(mapped, {
      ok: true,
      input: {
        name: "Hexaxim",
        dose: "second",
        administeredAt: "2026-01-01T00:00:00.000Z",
      },
    });
  });

  it("requires name and dose", () => {
    assert.deepEqual(
      growthVaccineCreateInput({ name: "  ", dose: "first" }),
      { ok: false, reason: "name" },
    );
    assert.deepEqual(
      growthVaccineCreateInput({ name: "Hexaxim", dose: null }),
      { ok: false, reason: "dose" },
    );
    assert.equal(
      growthVaccineSaveBlocked({ name: "", dose: "first" }),
      "name",
    );
    assert.equal(
      growthVaccineSaveBlocked({ name: "Hexaxim", dose: null }),
      "dose",
    );
  });
});

describe("growthMedNameSaveBlocked", () => {
  it("blocks blank and whitespace-only names", () => {
    assert.equal(growthMedNameSaveBlocked(""), true);
    assert.equal(growthMedNameSaveBlocked("   "), true);
    assert.equal(growthMedNameSaveBlocked("Paracetamol"), false);
    assert.equal(growthMedNameSaveBlocked(" D3 "), false);
  });
});

describe("buildBabyGrowthUpdateInput", () => {
  const id = "11111111-1111-4111-8111-111111111111";

  it("omits notes and valueText when the UI did not set them", () => {
    const input = buildBabyGrowthUpdateInput({
      id,
      kind: "weight",
      valueNum: 4.2,
      unit: "kg",
    });
    assert.equal("notes" in input, false);
    assert.equal("valueText" in input, false);
    assert.deepEqual(input, {
      id,
      kind: "weight",
      valueNum: 4.2,
      unit: "kg",
    });
  });

  it("includes notes and valueText when explicitly set (including null clear)", () => {
    const input = buildBabyGrowthUpdateInput({
      id,
      kind: "temperature",
      valueNum: 37.1,
      unit: "°C",
      notes: JSON.stringify({ v: 1, symptoms: ["cough"] }),
      valueText: null,
    });
    assert.equal(
      input.notes,
      JSON.stringify({ v: 1, symptoms: ["cough"] }),
    );
    assert.equal(input.valueText, null);
  });
});

describe("formatGrowthSummary", () => {
  it("summarizes symptoms-only temperature with title-case labels", () => {
    assert.equal(
      formatGrowthSummary({
        kind: "temperature",
        valueNum: null,
        notes: JSON.stringify({ v: 1, symptoms: ["cough", "rash"] }),
      }),
      "Cough, Rash",
    );
  });

  it("combines temperature value and symptoms", () => {
    assert.equal(
      formatGrowthSummary({
        kind: "temperature",
        valueNum: 37.2,
        unit: "°C",
        notes: JSON.stringify({ v: 1, symptoms: ["cough"] }),
      }),
      "37.2 °C · Cough",
    );
  });

  it("uses custom symptom labels when provided", () => {
    assert.equal(
      formatGrowthSummary(
        {
          kind: "temperature",
          valueNum: null,
          notes: JSON.stringify({ v: 1, symptoms: ["rash"] }),
        },
        { symptomLabel: (id) => (id === "rash" ? "Phát ban" : id) },
      ),
      "Phát ban",
    );
  });
});
