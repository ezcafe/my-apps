/**
 * Shared auto-finalize table fixture — read by the client planner test and
 * the server chain test so the two suites cannot drift apart.
 *
 * Client columns: request + localAfter (nap is NOT a client parameter).
 * Server columns: ordered write steps given breastRunning + in-tx napOpen.
 *
 * startBreast writes no row — it is client-local only (localAfter).
 */
import type { BabyBreastSide } from "@/lib/baby-breast-timer-store";

export type BabyQuickActionKind = "BREAST" | "FORMULA" | "SLEEP" | "DIAPER";

export type BabyQuickAction =
  | { kind: "BREAST"; side: BabyBreastSide }
  | { kind: "FORMULA"; amountMl: number }
  | { kind: "SLEEP" }
  | {
      kind: "DIAPER";
      diaperKind: "wet" | "dirty" | "mixed" | "dry";
      diaperColor?: string;
      diaperTexture?: string;
      diaperAmount?: string;
    };

export type BabyQuickCareStepName =
  | "saveBreast"
  | "endNap"
  | "startNap"
  | "createFormula"
  | "createDiaper";

export type AutoFinalizeTableRow = {
  id: string;
  /** What the caregiver pressed. */
  action: BabyQuickAction;
  /** Running breast timer on the device, or null. */
  breast: { side: BabyBreastSide; startedAt: number } | null;
  /** What the SERVER sees inside the lock (for server tests only). */
  napOpen: boolean;
  /** Client request.breastRunning expectation. */
  expectBreastRunning: { side: BabyBreastSide; durationSec: number } | null;
  /** Client localAfter after server confirms. */
  expectLocalAfter: {
    clearBreastTimer: boolean;
    startBreastSide: BabyBreastSide | null;
    stopBreastSession: boolean;
  };
  /** Ordered server write step names (empty = idle breast, no nap). */
  expectServerSteps: BabyQuickCareStepName[];
};

const NOW = 1_700_000_100_000;
const STARTED = NOW - 90_000; // 90s ago → durationSec 90

/** Every row of the design auto-finalize table. */
export const BABY_AUTO_FINALIZE_TABLE: AutoFinalizeTableRow[] = [
  {
    id: "breast-idle-no-nap",
    action: { kind: "BREAST", side: "breast_l" },
    breast: null,
    napOpen: false,
    expectBreastRunning: null,
    expectLocalAfter: { clearBreastTimer: false, startBreastSide: "breast_l", stopBreastSession: false },
    expectServerSteps: [],
  },
  {
    id: "breast-idle-nap-open",
    action: { kind: "BREAST", side: "breast_l" },
    breast: null,
    napOpen: true,
    expectBreastRunning: null,
    expectLocalAfter: { clearBreastTimer: false, startBreastSide: "breast_l", stopBreastSession: false },
    expectServerSteps: ["endNap"],
  },
  {
    id: "breast-same-side-no-nap",
    action: { kind: "BREAST", side: "breast_l" },
    breast: { side: "breast_l", startedAt: STARTED },
    napOpen: false,
    expectBreastRunning: { side: "breast_l", durationSec: 90 },
    expectLocalAfter: { clearBreastTimer: true, startBreastSide: null, stopBreastSession: true },
    expectServerSteps: ["saveBreast"],
  },
  {
    id: "breast-same-side-nap-open",
    action: { kind: "BREAST", side: "breast_l" },
    breast: { side: "breast_l", startedAt: STARTED },
    napOpen: true,
    expectBreastRunning: { side: "breast_l", durationSec: 90 },
    expectLocalAfter: { clearBreastTimer: true, startBreastSide: null, stopBreastSession: true },
    expectServerSteps: ["saveBreast", "endNap"],
  },
  {
    id: "breast-other-side-no-nap",
    action: { kind: "BREAST", side: "breast_l" },
    breast: { side: "breast_r", startedAt: STARTED },
    napOpen: false,
    expectBreastRunning: { side: "breast_r", durationSec: 90 },
    expectLocalAfter: {
      clearBreastTimer: true,
      startBreastSide: "breast_l",
      stopBreastSession: false,
    },
    expectServerSteps: ["saveBreast"],
  },
  {
    id: "breast-other-side-nap-open",
    action: { kind: "BREAST", side: "breast_l" },
    breast: { side: "breast_r", startedAt: STARTED },
    napOpen: true,
    expectBreastRunning: { side: "breast_r", durationSec: 90 },
    expectLocalAfter: {
      clearBreastTimer: true,
      startBreastSide: "breast_l",
      stopBreastSession: false,
    },
    expectServerSteps: ["saveBreast", "endNap"],
  },
  {
    id: "bottle-with-breast-and-nap",
    action: { kind: "FORMULA", amountMl: 120 },
    breast: { side: "breast_r", startedAt: STARTED },
    napOpen: true,
    expectBreastRunning: { side: "breast_r", durationSec: 90 },
    expectLocalAfter: { clearBreastTimer: true, startBreastSide: null, stopBreastSession: true },
    expectServerSteps: ["saveBreast", "endNap", "createFormula"],
  },
  {
    id: "sleep-start-with-breast",
    action: { kind: "SLEEP" },
    breast: { side: "breast_r", startedAt: STARTED },
    napOpen: false,
    expectBreastRunning: { side: "breast_r", durationSec: 90 },
    expectLocalAfter: { clearBreastTimer: true, startBreastSide: null, stopBreastSession: true },
    expectServerSteps: ["saveBreast", "startNap"],
  },
  {
    id: "sleep-end-with-breast",
    action: { kind: "SLEEP" },
    breast: { side: "breast_r", startedAt: STARTED },
    napOpen: true,
    expectBreastRunning: { side: "breast_r", durationSec: 90 },
    expectLocalAfter: { clearBreastTimer: true, startBreastSide: null, stopBreastSession: true },
    expectServerSteps: ["saveBreast", "endNap"],
  },
  {
    id: "diaper-with-breast-and-nap",
    action: { kind: "DIAPER", diaperKind: "wet" },
    breast: { side: "breast_r", startedAt: STARTED },
    napOpen: true,
    expectBreastRunning: { side: "breast_r", durationSec: 90 },
    expectLocalAfter: { clearBreastTimer: true, startBreastSide: null, stopBreastSession: true },
    expectServerSteps: ["saveBreast", "endNap", "createDiaper"],
  },
];

export const BABY_AUTO_FINALIZE_NOW = NOW;
