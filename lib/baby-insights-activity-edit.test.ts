import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activityEditMutationFor,
  buildActivityCareUpdatePayload,
  buildActivityGrowthUpdateInput,
  validateActivityCareEdit,
} from "@/lib/baby-insights-activity-edit";
import { updateBabyGrowthSchema } from "@/lib/validators/baby";

describe("activityEditMutationFor", () => {
  it("care editTarget save hits updateBabyEvent", () => {
    assert.equal(
      activityEditMutationFor({ source: "care", id: "c1" }, "update"),
      "updateBabyEvent",
    );
  });

  it("growth editTarget save hits updateBabyGrowth", () => {
    assert.equal(
      activityEditMutationFor({ source: "growth", id: "g1" }, "update"),
      "updateBabyGrowth",
    );
  });

  it("vaccine editTarget save hits updateBabyVaccine", () => {
    assert.equal(
      activityEditMutationFor({ source: "vaccine", id: "v1" }, "update"),
      "updateBabyVaccine",
    );
    assert.equal(
      activityEditMutationFor({ source: "vaccine", id: "v1" }, "delete"),
      "deleteBabyVaccine",
    );
  });

  it("care never maps to growth mutation", () => {
    assert.notEqual(
      activityEditMutationFor({ source: "care", id: "c1" }, "update"),
      "updateBabyGrowth",
    );
    assert.notEqual(
      activityEditMutationFor({ source: "care", id: "c1" }, "delete"),
      "deleteBabyGrowth",
    );
  });

  it("growth never maps to care mutation", () => {
    assert.notEqual(
      activityEditMutationFor({ source: "growth", id: "g1" }, "update"),
      "updateBabyEvent",
    );
  });
});

describe("validateActivityCareEdit", () => {
  it("validation fail for bad times returns i18n keys", () => {
    assert.equal(
      validateActivityCareEdit({
        occurredAt: "not-a-date",
        careType: "feed",
      }),
      "insights.editInvalidStart",
    );
    assert.equal(
      validateActivityCareEdit({
        occurredAt: "2026-09-14T10:00:00.000Z",
        endedAt: "2026-09-14T09:00:00.000Z",
        careType: "sleep",
      }),
      "insights.editEndBeforeStart",
    );
  });

  it("ok for valid feed times", () => {
    assert.equal(
      validateActivityCareEdit({
        occurredAt: "2026-09-14T10:00:00.000Z",
        careType: "feed",
      }),
      null,
    );
  });
});

describe("buildActivityCareUpdatePayload", () => {
  it("omits payload for sleep (time-only) edits", () => {
    assert.equal(
      buildActivityCareUpdatePayload({ careType: "sleep" }),
      undefined,
    );
  });

  it("never copies quickRequestId from stored payload", () => {
    const patch = buildActivityCareUpdatePayload({
      careType: "feed",
      amountMl: 120,
    });
    assert.deepEqual(patch, { amountMl: 120 });
    assert.equal(patch && "quickRequestId" in patch, false);
  });

  it("diaper patch is kind only", () => {
    assert.deepEqual(
      buildActivityCareUpdatePayload({
        careType: "diaper",
        diaperKind: "wet",
      }),
      { kind: "wet" },
    );
  });
});

describe("buildActivityGrowthUpdateInput", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const recordedAt = "2026-01-01T12:00:00.000Z";

  it("includes kind from row so weight edit passes update schema", () => {
    const input = buildActivityGrowthUpdateInput({
      id,
      kind: "weight",
      valueNum: 4.5,
      unit: "kg",
      notesFromForm: null,
      recordedAt,
    });
    assert.equal(input.kind, "weight");
    assert.equal(updateBabyGrowthSchema.safeParse(input).success, true);
  });

  it("rejects the old Activities shape without kind", () => {
    assert.equal(
      updateBabyGrowthSchema.safeParse({
        id,
        valueNum: 4.5,
        unit: "kg",
        notes: null,
        recordedAt,
      }).success,
      false,
    );
  });

  it("preserves temperature notes JSON and omits free-text form notes", () => {
    const symptomsJson = JSON.stringify({ v: 1, symptoms: ["cough"] });
    const input = buildActivityGrowthUpdateInput({
      id,
      kind: "temperature",
      valueNum: null,
      unit: null,
      notesFromForm: "felt warm free text",
      recordedAt,
      existingNotes: symptomsJson,
    });
    assert.equal(input.notes, symptomsJson);
    assert.notEqual(input.notes, "felt warm free text");
    assert.equal(updateBabyGrowthSchema.safeParse(input).success, true);
  });

  it("preserves medication valueText when Activities has no name field", () => {
    const input = buildActivityGrowthUpdateInput({
      id,
      kind: "medication",
      valueNum: 5,
      unit: "ml",
      notesFromForm: null,
      recordedAt,
      existingValueText: "Paracetamol",
    });
    assert.equal(input.valueText, "Paracetamol");
    assert.equal(updateBabyGrowthSchema.safeParse(input).success, true);
  });
});
