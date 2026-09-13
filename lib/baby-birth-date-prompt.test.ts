import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BABY_BIRTH_DATE_PROMPT_VISIT_KEY,
  BABY_BIRTH_DATE_PROMPT_LEGACY_SNOOZE_KEY,
  isBabyBirthDatePromptVisitDismissed,
  markBabyBirthDatePromptVisitDismissed,
  shouldShowBabyBirthDatePrompt,
} from "@/lib/baby-birth-date-prompt";

describe("shouldShowBabyBirthDatePrompt (visit-only)", () => {
  it("hides when birthDate is set", () => {
    assert.equal(
      shouldShowBabyBirthDatePrompt({
        birthDate: "2026-01-01",
        visitDismissed: false,
      }),
      false,
    );
  });

  it("shows when unset and visit dismiss flag is off", () => {
    assert.equal(
      shouldShowBabyBirthDatePrompt({
        birthDate: null,
        visitDismissed: false,
      }),
      true,
    );
  });

  it("hides after visit dismiss (same tab / refresh)", () => {
    assert.equal(
      shouldShowBabyBirthDatePrompt({
        birthDate: null,
        visitDismissed: true,
      }),
      false,
    );
  });

  it("legacy 7-day localStorage snooze does not block show", () => {
    assert.equal(
      BABY_BIRTH_DATE_PROMPT_LEGACY_SNOOZE_KEY,
      "baby.birthDatePrompt.dismissedUntil",
    );
    assert.equal(
      BABY_BIRTH_DATE_PROMPT_VISIT_KEY,
      "baby.birthDatePrompt.dismissedThisVisit",
    );
    // Leftover snooze lives only in a separate store; visit flag comes from session.
    const session = new Map<string, string>();
    const local = new Map<string, string>();
    local.set(
      BABY_BIRTH_DATE_PROMPT_LEGACY_SNOOZE_KEY,
      String(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );
    const visitDismissed = isBabyBirthDatePromptVisitDismissed({
      getItem: (k) => session.get(k) ?? null,
    });
    assert.equal(visitDismissed, false);
    assert.ok(local.has(BABY_BIRTH_DATE_PROMPT_LEGACY_SNOOZE_KEY));
    assert.equal(
      shouldShowBabyBirthDatePrompt({
        birthDate: null,
        visitDismissed,
      }),
      true,
    );
  });
});

describe("isBabyBirthDatePromptVisitDismissed", () => {
  it("reads sessionStorage flag only", () => {
    const store = new Map<string, string>();
    const sessionStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
    };
    assert.equal(isBabyBirthDatePromptVisitDismissed(sessionStorage), false);
    sessionStorage.setItem(BABY_BIRTH_DATE_PROMPT_VISIT_KEY, "1");
    assert.equal(isBabyBirthDatePromptVisitDismissed(sessionStorage), true);
    // Leftover localStorage snooze must not matter here
    store.set(BABY_BIRTH_DATE_PROMPT_LEGACY_SNOOZE_KEY, String(Date.now() + 1e9));
    assert.equal(isBabyBirthDatePromptVisitDismissed(sessionStorage), true);
  });
});

describe("markBabyBirthDatePromptVisitDismissed", () => {
  it("writes only the visit key — never legacy localStorage snooze", () => {
    const written: Array<[string, string]> = [];
    markBabyBirthDatePromptVisitDismissed({
      getItem: () => null,
      setItem: (k, v) => {
        written.push([k, v]);
      },
    });
    assert.deepEqual(written, [[BABY_BIRTH_DATE_PROMPT_VISIT_KEY, "1"]]);
    assert.equal(
      written.some(([k]) => k === BABY_BIRTH_DATE_PROMPT_LEGACY_SNOOZE_KEY),
      false,
    );
  });
});
