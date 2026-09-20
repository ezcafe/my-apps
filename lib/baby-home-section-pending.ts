import type { BabyQuickPendingOwnerId } from "@/lib/baby-quick-care-pending";

/** Breast shared footer: L then R. */
export const BABY_HOME_BREAST_PENDING_ORDER = [
  "breast_l",
  "breast_r",
] as const satisfies readonly BabyQuickPendingOwnerId[];

/** Pump shared footer: L → R → Both → amount. */
export const BABY_HOME_PUMP_PENDING_ORDER = [
  "pump_l",
  "pump_r",
  "pump_both",
  "pump_amount",
] as const satisfies readonly BabyQuickPendingOwnerId[];

/**
 * Pick one pending owner for a section footer.
 * Stable tie-break: first match in `sectionOrder`.
 */
export function babyHomePickSectionPendingOwner(
  pendingOwners: Iterable<BabyQuickPendingOwnerId>,
  sectionOrder: readonly BabyQuickPendingOwnerId[],
): BabyQuickPendingOwnerId | null {
  const set = new Set(pendingOwners);
  for (const id of sectionOrder) {
    if (set.has(id)) return id;
  }
  return null;
}
