/** Visit-only dismiss key (sessionStorage). Survives refresh; clears with the tab session. */
export const BABY_BIRTH_DATE_PROMPT_VISIT_KEY =
  "baby.birthDatePrompt.dismissedThisVisit";

/**
 * Old 7-day snooze key — keep the name so callers can stop writing it.
 * Show path must ignore leftover values in localStorage.
 */
export const BABY_BIRTH_DATE_PROMPT_LEGACY_SNOOZE_KEY =
  "baby.birthDatePrompt.dismissedUntil";

/** @deprecated Use BABY_BIRTH_DATE_PROMPT_LEGACY_SNOOZE_KEY — no longer written. */
export const BABY_BIRTH_DATE_PROMPT_KEY = BABY_BIRTH_DATE_PROMPT_LEGACY_SNOOZE_KEY;

/** Show when birthday is unset and this visit was not dismissed. */
export function shouldShowBabyBirthDatePrompt(input: {
  birthDate: string | null;
  visitDismissed: boolean;
}): boolean {
  if (input.birthDate != null) return false;
  if (input.visitDismissed) return false;
  return true;
}

export type BabyBirthDatePromptStorage = {
  getItem: (key: string) => string | null;
};

/** True when sessionStorage has the visit dismiss flag. */
export function isBabyBirthDatePromptVisitDismissed(
  sessionStorage: BabyBirthDatePromptStorage,
): boolean {
  try {
    return sessionStorage.getItem(BABY_BIRTH_DATE_PROMPT_VISIT_KEY) === "1";
  } catch {
    return false;
  }
}

export function markBabyBirthDatePromptVisitDismissed(
  sessionStorage: BabyBirthDatePromptStorage & {
    setItem: (key: string, value: string) => void;
  },
): void {
  try {
    sessionStorage.setItem(BABY_BIRTH_DATE_PROMPT_VISIT_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}
