import {
  decodeBabyTempSymptoms,
  type BabyTempSymptomId,
} from "@/lib/baby-growth-symptoms";

/** Shared Recent row after merging growth + vaccine sources. */
export type BabyGrowthRecentRow = {
  id: string;
  source: "growth" | "vaccine";
  at: string;
  kindLabel: string;
  summary: string;
  /** Growth kind or vaccine dose label key material. */
  growthKind?: string;
  vaccineName?: string;
  vaccineDose?: "first" | "second";
  valueNum?: number | null;
  valueText?: string | null;
  unit?: string | null;
  notes?: string | null;
  administeredAt?: string;
  recordedAt?: string;
};

export const BABY_GROWTH_RECENT_LIMIT = 50;

/**
 * Fetch N=50 each side, merge by time descending, take top N=50.
 */
export function mergeBabyGrowthRecentEntries(
  growth: readonly {
    id: string;
    kind: string;
    recordedAt: string;
    valueNum?: number | null;
    valueText?: string | null;
    unit?: string | null;
    notes?: string | null;
  }[],
  vaccines: readonly {
    id: string;
    name: string;
    dose: "first" | "second";
    administeredAt: string;
    notes?: string | null;
  }[],
  limit = BABY_GROWTH_RECENT_LIMIT,
): BabyGrowthRecentRow[] {
  const growthRows: BabyGrowthRecentRow[] = growth.map((g) => ({
    id: g.id,
    source: "growth",
    at: g.recordedAt,
    kindLabel: g.kind,
    summary: formatGrowthSummary(g),
    growthKind: g.kind,
    valueNum: g.valueNum,
    valueText: g.valueText,
    unit: g.unit,
    notes: g.notes,
    recordedAt: g.recordedAt,
  }));
  const vaccineRows: BabyGrowthRecentRow[] = vaccines.map((v) => ({
    id: v.id,
    source: "vaccine",
    at: v.administeredAt,
    kindLabel: "vaccine",
    summary: `${v.name} · ${v.dose}`,
    vaccineName: v.name,
    vaccineDose: v.dose,
    notes: v.notes,
    administeredAt: v.administeredAt,
  }));
  return [...growthRows, ...vaccineRows]
    .sort((a, b) => {
      const diff = Date.parse(b.at) - Date.parse(a.at);
      if (diff !== 0) return diff;
      return b.id.localeCompare(a.id);
    })
    .slice(0, limit);
}

/** Short Recent summary for a growth row (time is shown separately). */
export function formatGrowthSummary(
  g: {
    kind: string;
    valueNum?: number | null;
    valueText?: string | null;
    unit?: string | null;
    notes?: string | null;
  },
  opts?: {
    symptomLabel?: (id: BabyTempSymptomId) => string;
  },
): string {
  const labelSymptom =
    opts?.symptomLabel ??
    ((id: BabyTempSymptomId) => id.charAt(0).toUpperCase() + id.slice(1));

  if (g.kind === "medication" || g.kind === "vitamin") {
    const name = g.valueText?.trim() || g.kind;
    if (g.valueNum != null) {
      return `${name} ${g.valueNum}${g.unit ? ` ${g.unit}` : ""}`;
    }
    return name;
  }

  const tempBits: string[] = [];
  if (g.valueNum != null) {
    tempBits.push(`${g.valueNum}${g.unit ? ` ${g.unit}` : ""}`);
  }

  if (g.kind === "temperature") {
    const decoded = decodeBabyTempSymptoms(g.notes);
    if (!decoded.error && decoded.symptoms.length > 0) {
      tempBits.push(decoded.symptoms.map(labelSymptom).join(", "));
    }
    if (tempBits.length > 0) return tempBits.join(" · ");
    return g.kind;
  }

  if (g.valueNum != null) {
    return `${g.valueNum}${g.unit ? ` ${g.unit}` : ""}`;
  }
  if (g.valueText?.trim()) return g.valueText.trim();
  return g.kind;
}

/**
 * Partial updateBabyGrowth input — omit unset notes/valueText so Edit→Save
 * does not wipe DB fields the Growth form did not load.
 */
export function buildBabyGrowthUpdateInput(opts: {
  id: string;
  kind: string;
  valueNum?: number | null;
  valueText?: string | null;
  unit?: string | null;
  notes?: string | null;
  recordedAt?: string;
}): {
  id: string;
  kind: string;
  valueNum?: number | null;
  valueText?: string | null;
  unit?: string | null;
  notes?: string | null;
  recordedAt?: string;
} {
  return {
    id: opts.id,
    kind: opts.kind,
    ...(opts.valueNum !== undefined ? { valueNum: opts.valueNum } : {}),
    ...(opts.valueText !== undefined ? { valueText: opts.valueText } : {}),
    ...(opts.unit !== undefined ? { unit: opts.unit } : {}),
    ...(opts.notes !== undefined ? { notes: opts.notes } : {}),
    ...(opts.recordedAt !== undefined ? { recordedAt: opts.recordedAt } : {}),
  };
}

/** Maps Growth vaccine form state to createBabyVaccine input. */
export function growthVaccineCreateInput(opts: {
  name: string;
  dose: "first" | "second" | null;
  administeredAt?: string;
}):
  | { ok: true; input: { name: string; dose: "first" | "second"; administeredAt?: string } }
  | { ok: false; reason: "name" | "dose" } {
  const name = opts.name.trim();
  if (!name) return { ok: false, reason: "name" };
  if (opts.dose !== "first" && opts.dose !== "second") {
    return { ok: false, reason: "dose" };
  }
  return {
    ok: true,
    input: {
      name,
      dose: opts.dose,
      ...(opts.administeredAt ? { administeredAt: opts.administeredAt } : {}),
    },
  };
}

/** UI gate: vaccine Save needs name + dose. */
export function growthVaccineSaveBlocked(opts: {
  name: string;
  dose: "first" | "second" | null;
}): "name" | "dose" | null {
  const mapped = growthVaccineCreateInput(opts);
  if (mapped.ok) return null;
  return mapped.reason;
}

/** UI gate: medication/vitamin Save needs non-empty trimmed name. */
export function growthMedNameSaveBlocked(name: string): boolean {
  return name.trim().length === 0;
}
