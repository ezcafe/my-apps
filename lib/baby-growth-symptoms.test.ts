import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  babyTempNotesForSave,
  babyTemperatureHasContent,
  decodeBabyTempSymptoms,
  encodeBabyTempSymptoms,
} from "@/lib/baby-growth-symptoms";

describe("encodeBabyTempSymptoms / decodeBabyTempSymptoms", () => {
  it("round-trips allowlisted symptoms", () => {
    const encoded = encodeBabyTempSymptoms(["cough", "rash"]);
    assert.equal(encoded.ok, true);
    if (!encoded.ok) return;
    assert.equal(
      encoded.notes,
      JSON.stringify({ v: 1, symptoms: ["cough", "rash"] }),
    );
    const decoded = decodeBabyTempSymptoms(encoded.notes);
    assert.deepEqual(decoded.symptoms, ["cough", "rash"]);
    assert.equal(decoded.error, false);
  });

  it("rejects unknown symptom ids on encode", () => {
    const encoded = encodeBabyTempSymptoms(["cough", "fever"]);
    assert.deepEqual(encoded, { ok: false, reason: "unknown_id" });
  });

  it("treats invalid JSON as safe empty + error", () => {
    const decoded = decodeBabyTempSymptoms("not-json");
    assert.deepEqual(decoded.symptoms, []);
    assert.equal(decoded.error, true);
  });

  it("treats legacy free-text notes as safe empty + error", () => {
    const decoded = decodeBabyTempSymptoms("felt warm yesterday");
    assert.deepEqual(decoded.symptoms, []);
    assert.equal(decoded.error, true);
  });

  it("rejects unknown ids inside otherwise valid JSON", () => {
    const decoded = decodeBabyTempSymptoms(
      JSON.stringify({ v: 1, symptoms: ["cough", "fever"] }),
    );
    assert.deepEqual(decoded.symptoms, []);
    assert.equal(decoded.error, true);
  });

  it("empty notes decode to empty without error", () => {
    assert.deepEqual(decodeBabyTempSymptoms(null), {
      symptoms: [],
      error: false,
    });
    assert.deepEqual(decodeBabyTempSymptoms(""), {
      symptoms: [],
      error: false,
    });
  });
});

describe("babyTempNotesForSave", () => {
  it("blocks Save after invalid decode until user re-picks", () => {
    const blocked = babyTempNotesForSave({
      previousNotes: "legacy free text",
      symptoms: [],
      symptomsTouched: false,
    });
    assert.deepEqual(blocked, { ok: false, reason: "needs_repick" });
  });

  it("allows Save after explicit re-pick with valid JSON", () => {
    const saved = babyTempNotesForSave({
      previousNotes: "legacy free text",
      symptoms: ["cough"],
      symptomsTouched: true,
    });
    assert.equal(saved.ok, true);
    if (!saved.ok) return;
    assert.equal(
      saved.notes,
      JSON.stringify({ v: 1, symptoms: ["cough"] }),
    );
  });

  it("allows clear after touch (null notes)", () => {
    const saved = babyTempNotesForSave({
      previousNotes: "legacy",
      symptoms: [],
      symptomsTouched: true,
    });
    assert.deepEqual(saved, { ok: true, notes: null });
  });
});

describe("babyTemperatureHasContent", () => {
  it("accepts temp-only, symptoms-only, and both", () => {
    assert.equal(
      babyTemperatureHasContent({ valueNum: 37.2, notes: null }),
      true,
    );
    assert.equal(
      babyTemperatureHasContent({
        valueNum: null,
        notes: JSON.stringify({ v: 1, symptoms: ["cough"] }),
      }),
      true,
    );
    assert.equal(
      babyTemperatureHasContent({
        valueNum: 38,
        notes: JSON.stringify({ v: 1, symptoms: ["rash"] }),
      }),
      true,
    );
  });

  it("rejects empty temperature (no value + no symptoms)", () => {
    assert.equal(
      babyTemperatureHasContent({ valueNum: null, notes: null }),
      false,
    );
    assert.equal(
      babyTemperatureHasContent({ valueNum: undefined, notes: "" }),
      false,
    );
  });
});
