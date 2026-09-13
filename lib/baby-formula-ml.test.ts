import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractFormulaMlFromPayload } from "@/lib/baby-formula-ml";

describe("extractFormulaMlFromPayload", () => {
  it("reads formula leg amount from non-empty legs", () => {
    assert.equal(
      extractFormulaMlFromPayload({
        method: "formula",
        amountMl: 999,
        legs: [{ method: "formula", amountMl: 90 }],
      }),
      90,
    );
  });

  it("reads legacy top-level when legs missing or empty", () => {
    assert.equal(
      extractFormulaMlFromPayload({ method: "formula", amountMl: 120 }),
      120,
    );
    assert.equal(
      extractFormulaMlFromPayload({
        method: "formula",
        amountMl: 120,
        legs: [],
      }),
      120,
    );
  });

  it("breast-only non-empty legs → null even if top-level amountMl exists", () => {
    assert.equal(
      extractFormulaMlFromPayload({
        method: "breast_l",
        amountMl: 120,
        legs: [{ method: "breast_l", durationSec: 300 }],
      }),
      null,
    );
  });

  it("merged breast + formula legs → formula ml only", () => {
    assert.equal(
      extractFormulaMlFromPayload({
        method: "formula",
        amountMl: 90,
        legs: [
          { method: "breast_l", durationSec: 200 },
          { method: "formula", amountMl: 90 },
        ],
      }),
      90,
    );
  });

  it("non-empty legs with no formula leg → null (no top-level fall-through)", () => {
    assert.equal(
      extractFormulaMlFromPayload({
        method: "formula",
        amountMl: 150,
        legs: [{ method: "breast_r", durationSec: 120 }],
      }),
      null,
    );
  });
});
