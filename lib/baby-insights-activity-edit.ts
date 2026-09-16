/**
 * Pure routing for Activity log edit saves — care vs growth mutations.
 * Unit-tested so the modal cannot call the wrong API.
 */
export type ActivityEditTarget = { source: "care" | "growth"; id: string };

export type ActivityEditMutationKind =
  | "updateBabyEvent"
  | "updateBabyGrowth"
  | "deleteBabyEvent"
  | "deleteBabyGrowth";

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
