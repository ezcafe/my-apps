/**
 * Shared auto-finalize table fixture — read by the client planner test and
 * the server chain test so the two suites cannot drift apart.
 *
 * Client columns: request + localAfter (nap is NOT a client parameter).
 * Server columns: ordered write steps given breastRunning + in-tx napOpen.
 *
 * startBreast writes no row — it is client-local only (localAfter).
 */
import type {
  BabyBreastCareSide,
  BabyCareTimerSide,
  BabyPumpCareSide,
} from "@/lib/baby-breast-timer-store";

export type BabyQuickActionKind =
  | "BREAST"
  | "FORMULA"
  | "PUMP_AMOUNT"
  | "SLEEP"
  | "DIAPER";

export type BabyQuickAction =
  | { kind: "BREAST"; side: BabyCareTimerSide }
  | { kind: "FORMULA"; amountMl: number }
  | { kind: "PUMP_AMOUNT"; amountMl: number }
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
  | "createPumpAmount"
  | "createDiaper";

export type AutoFinalizeLocalAfter = {
  clearBreastTimer: boolean;
  startBreastSide: BabyBreastCareSide | null;
  stopBreastSession: boolean;
  clearPumpTimer: boolean;
  startPumpSide: BabyPumpCareSide | null;
  stopPumpSession: boolean;
};

function la(
  partial: Partial<AutoFinalizeLocalAfter> &
    Pick<
      AutoFinalizeLocalAfter,
      "clearBreastTimer" | "startBreastSide" | "stopBreastSession"
    >,
): AutoFinalizeLocalAfter {
  return {
    clearPumpTimer: false,
    startPumpSide: null,
    stopPumpSession: false,
    ...partial,
  };
}

export type AutoFinalizeTableRow = {
  id: string;
  /** What the caregiver pressed. */
  action: BabyQuickAction;
  /** Running care timer on the device, or null. */
  breast: { side: BabyCareTimerSide; startedAt: number } | null;
  /** What the SERVER sees inside the lock (for server tests only). */
  napOpen: boolean;
  /** Client request.breastRunning expectation. */
  expectBreastRunning: {
    side: BabyCareTimerSide;
    durationSec: number;
  } | null;
  /** Client localAfter after server confirms. */
  expectLocalAfter: AutoFinalizeLocalAfter;
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
    expectLocalAfter: la({
      clearBreastTimer: false,
      startBreastSide: "breast_l",
      stopBreastSession: false,
    }),
    expectServerSteps: [],
  },
  {
    id: "breast-idle-nap-open",
    action: { kind: "BREAST", side: "breast_l" },
    breast: null,
    napOpen: true,
    expectBreastRunning: null,
    expectLocalAfter: la({
      clearBreastTimer: false,
      startBreastSide: "breast_l",
      stopBreastSession: false,
    }),
    expectServerSteps: ["endNap"],
  },
  {
    id: "breast-same-side-no-nap",
    action: { kind: "BREAST", side: "breast_l" },
    breast: { side: "breast_l", startedAt: STARTED },
    napOpen: false,
    expectBreastRunning: { side: "breast_l", durationSec: 90 },
    expectLocalAfter: la({
      clearBreastTimer: true,
      startBreastSide: null,
      stopBreastSession: true,
    }),
    expectServerSteps: ["saveBreast"],
  },
  {
    id: "breast-same-side-nap-open",
    action: { kind: "BREAST", side: "breast_l" },
    breast: { side: "breast_l", startedAt: STARTED },
    napOpen: true,
    expectBreastRunning: { side: "breast_l", durationSec: 90 },
    expectLocalAfter: la({
      clearBreastTimer: true,
      startBreastSide: null,
      stopBreastSession: true,
    }),
    expectServerSteps: ["saveBreast", "endNap"],
  },
  {
    id: "breast-other-side-no-nap",
    action: { kind: "BREAST", side: "breast_l" },
    breast: { side: "breast_r", startedAt: STARTED },
    napOpen: false,
    expectBreastRunning: { side: "breast_r", durationSec: 90 },
    expectLocalAfter: la({
      clearBreastTimer: true,
      startBreastSide: "breast_l",
      stopBreastSession: false,
    }),
    expectServerSteps: ["saveBreast"],
  },
  {
    id: "breast-other-side-nap-open",
    action: { kind: "BREAST", side: "breast_l" },
    breast: { side: "breast_r", startedAt: STARTED },
    napOpen: true,
    expectBreastRunning: { side: "breast_r", durationSec: 90 },
    expectLocalAfter: la({
      clearBreastTimer: true,
      startBreastSide: "breast_l",
      stopBreastSession: false,
    }),
    expectServerSteps: ["saveBreast", "endNap"],
  },
  {
    id: "pump-l-stop-no-nap",
    action: { kind: "BREAST", side: "pump_l" },
    breast: { side: "pump_l", startedAt: STARTED },
    napOpen: false,
    expectBreastRunning: { side: "pump_l", durationSec: 90 },
    expectLocalAfter: la({
      clearBreastTimer: false,
      startBreastSide: null,
      stopBreastSession: false,
      clearPumpTimer: true,
      startPumpSide: null,
      stopPumpSession: true,
    }),
    expectServerSteps: ["saveBreast"],
  },
  {
    id: "bottle-with-breast-and-nap",
    action: { kind: "FORMULA", amountMl: 120 },
    breast: { side: "breast_r", startedAt: STARTED },
    napOpen: true,
    expectBreastRunning: { side: "breast_r", durationSec: 90 },
    expectLocalAfter: la({
      clearBreastTimer: true,
      startBreastSide: null,
      stopBreastSession: true,
    }),
    expectServerSteps: ["saveBreast", "endNap", "createFormula"],
  },
  {
    id: "pump-amount-idle",
    action: { kind: "PUMP_AMOUNT", amountMl: 90 },
    breast: null,
    napOpen: false,
    expectBreastRunning: null,
    expectLocalAfter: la({
      clearBreastTimer: false,
      startBreastSide: null,
      stopBreastSession: false,
    }),
    expectServerSteps: ["createPumpAmount"],
  },
  {
    id: "pump-amount-with-pump-r-running",
    action: { kind: "PUMP_AMOUNT", amountMl: 90 },
    breast: { side: "pump_r", startedAt: STARTED },
    napOpen: false,
    expectBreastRunning: null,
    expectLocalAfter: la({
      clearBreastTimer: false,
      startBreastSide: null,
      stopBreastSession: false,
    }),
    expectServerSteps: ["createPumpAmount"],
  },
  {
    id: "pump-amount-with-breast-and-nap",
    action: { kind: "PUMP_AMOUNT", amountMl: 90 },
    breast: { side: "breast_r", startedAt: STARTED },
    napOpen: true,
    expectBreastRunning: null,
    expectLocalAfter: la({
      clearBreastTimer: false,
      startBreastSide: null,
      stopBreastSession: false,
    }),
    // Pump family does not end nap or stop breast
    expectServerSteps: ["createPumpAmount"],
  },
  {
    id: "sleep-start-with-breast",
    action: { kind: "SLEEP" },
    breast: { side: "breast_r", startedAt: STARTED },
    napOpen: false,
    expectBreastRunning: { side: "breast_r", durationSec: 90 },
    expectLocalAfter: la({
      clearBreastTimer: true,
      startBreastSide: null,
      stopBreastSession: true,
    }),
    expectServerSteps: ["saveBreast", "startNap"],
  },
  {
    id: "sleep-end-with-breast",
    action: { kind: "SLEEP" },
    breast: { side: "breast_r", startedAt: STARTED },
    napOpen: true,
    expectBreastRunning: { side: "breast_r", durationSec: 90 },
    expectLocalAfter: la({
      clearBreastTimer: true,
      startBreastSide: null,
      stopBreastSession: true,
    }),
    expectServerSteps: ["saveBreast", "endNap"],
  },
  {
    id: "diaper-with-breast-and-nap",
    action: { kind: "DIAPER", diaperKind: "wet" },
    breast: { side: "breast_r", startedAt: STARTED },
    napOpen: true,
    expectBreastRunning: { side: "breast_r", durationSec: 90 },
    expectLocalAfter: la({
      clearBreastTimer: true,
      startBreastSide: null,
      stopBreastSession: true,
    }),
    expectServerSteps: ["saveBreast", "endNap", "createDiaper"],
  },
];

export const BABY_AUTO_FINALIZE_NOW = NOW;
