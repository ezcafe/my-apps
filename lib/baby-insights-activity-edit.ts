/**
 * Pure routing for Activity log edit saves — care / growth / vaccine mutations.
 * Unit-tested so the modal cannot call the wrong API.
 */
export type ActivityEditTarget = {
  source: "care" | "growth" | "vaccine";
  id: string;
};

export type ActivityEditMutationKind =
  | "updateBabyEvent"
  | "updateBabyGrowth"
  | "updateBabyVaccine"
  | "deleteBabyEvent"
  | "deleteBabyGrowth"
  | "deleteBabyVaccine";

/** i18n keys for care edit client validation (translate at the modal). */
export type ActivityCareEditErrorKey =
  | "insights.editInvalidStart"
  | "insights.editInvalidEnd"
  | "insights.editEndBeforeStart";

export function activityEditMutationFor(
  target: ActivityEditTarget,
  action: "update" | "delete",
): ActivityEditMutationKind {
  if (target.source === "care") {
    return action === "update" ? "updateBabyEvent" : "deleteBabyEvent";
  }
  if (target.source === "vaccine") {
    return action === "update" ? "updateBabyVaccine" : "deleteBabyVaccine";
  }
  return action === "update" ? "updateBabyGrowth" : "deleteBabyGrowth";
}

export function isValidIsoDateTime(value: string): boolean {
  const ms = Date.parse(value);
  return Number.isFinite(ms);
}

/** Client-side soft validation before calling care update. Returns i18n keys. */
export function validateActivityCareEdit(input: {
  occurredAt: string;
  endedAt?: string | null;
  careType?: string;
}): ActivityCareEditErrorKey | null {
  if (!isValidIsoDateTime(input.occurredAt)) {
    return "insights.editInvalidStart";
  }
  if (input.careType === "sleep" && input.endedAt) {
    if (!isValidIsoDateTime(input.endedAt)) {
      return "insights.editInvalidEnd";
    }
    if (Date.parse(input.endedAt) <= Date.parse(input.occurredAt)) {
      return "insights.editEndBeforeStart";
    }
  }
  return null;
}

/**
 * Patch-only payload for updateBabyEvent.
 * Never copies stored keys (e.g. quickRequestId) — server merges onto existing.
 * Returns undefined when there is nothing editable to patch.
 */
export function buildActivityCareUpdatePayload(input: {
  careType?: string;
  amountMl?: number | null;
  diaperKind?: string | null;
}): Record<string, unknown> | undefined {
  const patch: Record<string, unknown> = {};
  if (input.careType === "feed" && input.amountMl != null) {
    patch.amountMl = input.amountMl;
  }
  if (input.careType === "diaper" && input.diaperKind) {
    patch.kind = input.diaperKind;
  }
  return Object.keys(patch).length > 0 ? patch : undefined;
}

/**
 * Activities/Insights growth edit payload for updateBabyGrowth.
 * Always sends kind from the row so Zod health rules apply.
 * Temperature: preserves stored symptoms JSON (D5) — never free-text form notes.
 * Med/vitamin: preserves stored name (modal has no name field).
 */
export function buildActivityGrowthUpdateInput(input: {
  id: string;
  kind: string | undefined;
  valueNum: number | null;
  unit: string | null;
  notesFromForm: string | null;
  recordedAt: string;
  existingNotes?: string | null;
  existingValueText?: string | null;
}): {
  id: string;
  kind?: string;
  valueNum: number | null;
  unit: string | null;
  notes?: string | null;
  valueText?: string | null;
  recordedAt: string;
} {
  const out: {
    id: string;
    kind?: string;
    valueNum: number | null;
    unit: string | null;
    notes?: string | null;
    valueText?: string | null;
    recordedAt: string;
  } = {
    id: input.id,
    valueNum: input.valueNum,
    unit: input.unit,
    recordedAt: input.recordedAt,
  };
  if (input.kind) {
    out.kind = input.kind;
  }
  if (input.kind === "temperature") {
    // D5: do not replace symptoms JSON with Activities free-text notes.
    out.notes = input.existingNotes ?? null;
  } else {
    out.notes = input.notesFromForm;
  }
  if (input.kind === "medication" || input.kind === "vitamin") {
    out.valueText = input.existingValueText ?? null;
  }
  return out;
}
