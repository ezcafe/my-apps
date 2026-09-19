import type { ActivityLogRow } from "@/lib/baby-insights-activity-log";

/** Accent family for Activities row chrome (maps to CSS vars). */
export type BabyActivityAccentFamily =
  | "sleep"
  | "feed"
  | "diaper"
  | "pump"
  | "med"
  | "growth"
  | "other";

const PUMP_METHODS = new Set(["pump", "pump_l", "pump_r"]);

function feedMethodFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as {
    method?: unknown;
    legs?: Array<{ method?: unknown }>;
  };
  if (typeof p.method === "string") return p.method;
  const leg = p.legs?.find((l) => typeof l.method === "string");
  return typeof leg?.method === "string" ? leg.method : null;
}

/** Pure: map activity log row → accent family. */
export function babyActivityAccentFamily(
  row: Pick<ActivityLogRow, "source" | "careType" | "growthKind" | "payload">,
): BabyActivityAccentFamily {
  if (row.source === "care") {
    if (row.careType === "sleep") return "sleep";
    if (row.careType === "diaper") return "diaper";
    if (row.careType === "feed") {
      const method = feedMethodFromPayload(row.payload);
      if (method && PUMP_METHODS.has(method)) return "pump";
      return "feed";
    }
    return "other";
  }
  if (row.source === "vaccine") return "other";
  switch (row.growthKind) {
    case "medication":
      return "med";
    case "pump":
      return "pump";
    case "weight":
    case "height":
    case "head":
    case "temperature":
    case "vitamin":
      return "growth";
    default:
      return "other";
  }
}

/** CSS custom property name for the family (without var()). */
export function babyActivityAccentCssVar(
  family: BabyActivityAccentFamily,
): string {
  return `--baby-act-${family}`;
}
