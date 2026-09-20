import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dismissBabyBirthDateModalVisit,
  saveBabyBirthDateFromModal,
} from "@/lib/baby-birth-date-modal";
import { BABY_BIRTH_DATE_PROMPT_VISIT_KEY } from "@/lib/baby-birth-date-prompt";

describe("saveBabyBirthDateFromModal", () => {
  it("success: updateBabyProfile request + invalidate, ok true", async () => {
    const calls: Array<{ query: string; vars: unknown }> = [];
    let invalidated = 0;
    const result = await saveBabyBirthDateFromModal({
      birthDate: " 2026-06-01 ",
      request: async (query, vars) => {
        calls.push({ query, vars });
        return { updateBabyProfile: { id: "b1", birthDate: "2026-06-01" } };
      },
      onInvalidateProfile: async () => {
        invalidated += 1;
      },
    });
    assert.deepEqual(result, { ok: true });
    assert.equal(calls.length, 1);
    assert.match(calls[0]!.query, /updateBabyProfile/);
    assert.deepEqual(calls[0]!.vars, {
      input: { birthDate: "2026-06-01" },
    });
    assert.equal(invalidated, 1);
  });

  it("empty date → required error key; no request / invalidate", async () => {
    let requested = 0;
    let invalidated = 0;
    const result = await saveBabyBirthDateFromModal({
      birthDate: "   ",
      request: async () => {
        requested += 1;
      },
      onInvalidateProfile: async () => {
        invalidated += 1;
      },
    });
    assert.deepEqual(result, {
      ok: false,
      errorKey: "settings.birthDateRequired",
    });
    assert.equal(requested, 0);
    assert.equal(invalidated, 0);
  });

  it("server token maps to settings error key; no invalidate", async () => {
    let invalidated = 0;
    const result = await saveBabyBirthDateFromModal({
      birthDate: "2026-06-01",
      request: async () => {
        throw new Error("failed: BABY_BIRTH_DATE_INVALID");
      },
      onInvalidateProfile: async () => {
        invalidated += 1;
      },
    });
    assert.deepEqual(result, {
      ok: false,
      errorKey: "settings.birthDateInvalid",
    });
    assert.equal(invalidated, 0);
  });

  it("success marks visit dismiss so remount with null birthDate stays closed", async () => {
    const written: Array<[string, string]> = [];
    const result = await saveBabyBirthDateFromModal({
      birthDate: "2026-06-01",
      request: async () => ({
        updateBabyProfile: { id: "b1", birthDate: "2026-06-01" },
      }),
      onInvalidateProfile: async () => {},
      visitStorage: {
        getItem: () => null,
        setItem: (k, v) => {
          written.push([k, v]);
        },
      },
    });
    assert.deepEqual(result, { ok: true });
    assert.deepEqual(written, [[BABY_BIRTH_DATE_PROMPT_VISIT_KEY, "1"]]);
  });

  it("invalidate failure after commit still ok; not a birth-field error", async () => {
    const result = await saveBabyBirthDateFromModal({
      birthDate: "2026-06-01",
      request: async () => ({
        updateBabyProfile: { id: "b1", birthDate: "2026-06-01" },
      }),
      onInvalidateProfile: async () => {
        throw new Error("network: cache refresh failed");
      },
    });
    assert.deepEqual(result, { ok: true });
    assert.equal("errorKey" in result, false);
  });
});

describe("dismissBabyBirthDateModalVisit", () => {
  it("marks visit dismiss in sessionStorage (Not now)", () => {
    const written: Array<[string, string]> = [];
    dismissBabyBirthDateModalVisit({
      getItem: () => null,
      setItem: (k, v) => {
        written.push([k, v]);
      },
    });
    assert.deepEqual(written, [[BABY_BIRTH_DATE_PROMPT_VISIT_KEY, "1"]]);
  });
});
