/**
 * Which Telegram notify kinds fire for a babyQuickCare result.
 * endNap is silent. Feed notifies only when wrote === "insert".
 * Replay and empty steps → none.
 */
export type BabyQuickNotifyKind = "feed" | "diaper" | "sleep";

export function babyQuickCareNotifyKinds(
  steps: Array<{ step: string; wrote?: string }>,
  replayed: boolean,
): BabyQuickNotifyKind[] {
  if (replayed) return [];
  const kinds: BabyQuickNotifyKind[] = [];
  for (const step of steps) {
    if (step.step === "endNap") continue;
    if (step.step === "saveBreast" || step.step === "createFormula") {
      if (step.wrote === "update") continue;
      // Missing wrote (legacy replay) treated as insert.
      if (step.wrote == null || step.wrote === "insert") {
        kinds.push("feed");
      }
    } else if (step.step === "createDiaper") {
      kinds.push("diaper");
    } else if (step.step === "startNap") {
      kinds.push("sleep");
    }
  }
  return kinds;
}
