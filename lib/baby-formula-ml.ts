/**
 * One formula ml value per feed event for bottle chip history.
 * Legs (when non-empty) win — no top-level fall-through.
 */

function isFormulaMethod(method: unknown): boolean {
  return method === "formula";
}

function positiveMl(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

/**
 * Extract formula ml from a feed payload.
 * 1. Non-empty `legs` → formula leg amountMl only (null if none).
 * 2. Else legacy top-level when formula ml present.
 */
export function extractFormulaMlFromPayload(
  payload: unknown,
): number | null {
  if (payload == null || typeof payload !== "object") return null;
  const p = payload as {
    method?: unknown;
    amountMl?: unknown;
    legs?: unknown;
  };

  if (Array.isArray(p.legs) && p.legs.length > 0) {
    let total: number | null = null;
    for (const leg of p.legs) {
      if (leg == null || typeof leg !== "object") continue;
      const l = leg as { method?: unknown; amountMl?: unknown };
      if (!isFormulaMethod(l.method)) continue;
      const ml = positiveMl(l.amountMl);
      if (ml == null) continue;
      total = (total ?? 0) + ml;
    }
    return total;
  }

  // Legacy / empty legs: top-level when formula method + amount
  if (isFormulaMethod(p.method)) {
    return positiveMl(p.amountMl);
  }
  return null;
}
