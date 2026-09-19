/** Fixed symptom ids for temperature notes JSON (v:1). */
export const BABY_TEMP_SYMPTOM_IDS = [
  "cough",
  "vomiting",
  "rash",
  "breathing",
  "sleepiness",
] as const;

export type BabyTempSymptomId = (typeof BABY_TEMP_SYMPTOM_IDS)[number];

const ALLOWED = new Set<string>(BABY_TEMP_SYMPTOM_IDS);

export type DecodeBabyTempSymptomsResult = {
  symptoms: BabyTempSymptomId[];
  /** True when notes were present but not valid v:1 allowlisted JSON. */
  error: boolean;
};

/**
 * Parse temperature `notes` into allowlisted symptom ids.
 * Invalid / legacy / wrong version → empty symptoms + error (safe display).
 */
export function decodeBabyTempSymptoms(
  notes: string | null | undefined,
): DecodeBabyTempSymptomsResult {
  if (notes == null || notes.trim() === "") {
    return { symptoms: [], error: false };
  }
  try {
    const parsed: unknown = JSON.parse(notes);
    if (
      parsed == null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return { symptoms: [], error: true };
    }
    const obj = parsed as { v?: unknown; symptoms?: unknown };
    if (obj.v !== 1 || !Array.isArray(obj.symptoms)) {
      return { symptoms: [], error: true };
    }
    const out: BabyTempSymptomId[] = [];
    for (const id of obj.symptoms) {
      if (typeof id !== "string" || !ALLOWED.has(id)) {
        return { symptoms: [], error: true };
      }
      if (!out.includes(id as BabyTempSymptomId)) {
        out.push(id as BabyTempSymptomId);
      }
    }
    return { symptoms: out, error: false };
  } catch {
    return { symptoms: [], error: true };
  }
}

export type EncodeBabyTempSymptomsResult =
  | { ok: true; notes: string | null }
  | { ok: false; reason: "unknown_id" };

/**
 * Encode allowlisted symptoms into temperature notes JSON.
 * Empty list → null notes (temp-only rows).
 */
export function encodeBabyTempSymptoms(
  symptoms: readonly string[],
): EncodeBabyTempSymptomsResult {
  for (const id of symptoms) {
    if (!ALLOWED.has(id)) {
      return { ok: false, reason: "unknown_id" };
    }
  }
  const unique = [
    ...new Set(symptoms.filter((id) => ALLOWED.has(id))),
  ] as BabyTempSymptomId[];
  if (unique.length === 0) {
    return { ok: true, notes: null };
  }
  return {
    ok: true,
    notes: JSON.stringify({ v: 1, symptoms: unique }),
  };
}

/**
 * Temperature notes for create/update Save.
 * After invalid/legacy decode, block until the UI marks an explicit re-pick.
 */
export function babyTempNotesForSave(opts: {
  previousNotes: string | null | undefined;
  symptoms: readonly string[];
  /** User toggled/cleared symptoms in the form after load. */
  symptomsTouched: boolean;
}): EncodeBabyTempSymptomsResult | { ok: false; reason: "needs_repick" } {
  const decoded = decodeBabyTempSymptoms(opts.previousNotes);
  if (decoded.error && !opts.symptomsTouched) {
    return { ok: false, reason: "needs_repick" };
  }
  return encodeBabyTempSymptoms(opts.symptoms);
}

/** True when temperature has value and/or non-empty allowlisted symptoms. */
export function babyTemperatureHasContent(opts: {
  valueNum: number | null | undefined;
  notes: string | null | undefined;
}): boolean {
  if (opts.valueNum != null && Number.isFinite(opts.valueNum)) return true;
  const decoded = decodeBabyTempSymptoms(opts.notes);
  if (decoded.error) return false;
  return decoded.symptoms.length > 0;
}
