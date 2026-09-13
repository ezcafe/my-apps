/**
 * Maps stable server tokens to i18n keys. Raw Zod / GraphQL text is never shown.
 */
export const BABY_BIRTH_DATE_ERROR_KEYS = {
  BABY_BIRTH_DATE_REQUIRED: "settings.birthDateRequired",
  BABY_BIRTH_DATE_INVALID: "settings.birthDateInvalid",
  BABY_BIRTH_DATE_FUTURE: "settings.birthDateFuture",
  BABY_BIRTH_DATE_TOO_OLD: "settings.birthDateTooOld",
} as const;

export type BabyBirthDateErrorToken = keyof typeof BABY_BIRTH_DATE_ERROR_KEYS;

/** Finds the first known token inside a server message. Otherwise generic. */
export function babyBirthDateErrorKey(message: unknown): string {
  const text = typeof message === "string" ? message : String(message ?? "");
  for (const token of Object.keys(BABY_BIRTH_DATE_ERROR_KEYS) as BabyBirthDateErrorToken[]) {
    if (text.includes(token)) {
      return BABY_BIRTH_DATE_ERROR_KEYS[token];
    }
  }
  return "settings.birthDateSaveFailed";
}
