import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BABY_BIRTH_DATE_ERROR_KEYS,
  babyBirthDateErrorKey,
} from "@/lib/baby-birth-date-errors";

describe("babyBirthDateErrorKey", () => {
  it("maps each token to its i18n key", () => {
    for (const [token, key] of Object.entries(BABY_BIRTH_DATE_ERROR_KEYS)) {
      assert.equal(
        babyBirthDateErrorKey(`Validation failed: [{"message":"${token}"}]`),
        key,
      );
    }
  });

  it("falls back for Zod blob, UNAUTHORIZED, and network", () => {
    assert.equal(
      babyBirthDateErrorKey('Validation failed: [{"code":"custom"}]'),
      "settings.birthDateSaveFailed",
    );
    assert.equal(
      babyBirthDateErrorKey("UNAUTHORIZED"),
      "settings.birthDateSaveFailed",
    );
    assert.equal(
      babyBirthDateErrorKey(new Error("network")),
      "settings.birthDateSaveFailed",
    );
  });

  it("token list matches key map entries", () => {
    assert.deepEqual(Object.keys(BABY_BIRTH_DATE_ERROR_KEYS).sort(), [
      "BABY_BIRTH_DATE_FUTURE",
      "BABY_BIRTH_DATE_INVALID",
      "BABY_BIRTH_DATE_REQUIRED",
      "BABY_BIRTH_DATE_TOO_OLD",
    ]);
  });
});
