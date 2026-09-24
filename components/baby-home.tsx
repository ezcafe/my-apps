"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BabyBreastSidePair } from "@/components/baby-breast-side-pair";
import { BabyCareGuidelines } from "@/components/baby-care-guidelines";
import { buildBabyCareGuidelineModel } from "@/lib/baby-care-guideline-content";
import { BabyCustomMlModal } from "@/components/baby-custom-ml-modal";
import { BabyCustomTimeChip } from "@/components/baby-custom-time-chip";
import { BabyCustomTimeModal } from "@/components/baby-custom-time-modal";
import { BabyDiaperDetailSheet } from "@/components/baby-diaper-detail-sheet";
import { BabyDiaperKindControl } from "@/components/baby-diaper-kind-control";
import { useBabyLocale } from "@/components/baby-locale-provider";
import { BabyMlChipSection } from "@/components/baby-ml-chip-section";
import { BabyPumpSidePair } from "@/components/baby-pump-side-pair";
import {
  BabyTimedCareChip,
  babyTimedCareChipLabel,
} from "@/components/baby-timed-care-chip";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  IconBabyBottle,
  IconBabyBreast,
  IconBabyDiaper,
  IconBabyPump,
  IconBabySleep,
} from "@/components/icons/icon-baby-nav";
import {
  BABY_BOTTLE_CHIPS_NO_BIRTH_SNAPS,
  babyAgeInDays,
  babyCareGuideStageForAge,
  babyBreastSessionGuideForAge,
  babyFeedGuideForAge,
  babyBottleSnapsForBand,
  babySleepGuideForAge,
  babySuggestedBottleMl,
  buildBabyBottleChipMls,
} from "@/lib/baby-age-guide";
import { babyGraphQLRequest } from "@/lib/baby-gql-client";
import {
  dismissBabyBirthDateModalVisit,
  saveBabyBirthDateFromModal,
} from "@/lib/baby-birth-date-modal";
import {
  BABY_HOME_BIG_CONTROL_MIN_H,
} from "@/lib/baby-home-control-height";
import {
  BABY_HOME_BREAST_PENDING_ORDER,
  BABY_HOME_PUMP_PENDING_ORDER,
  babyHomePickSectionPendingOwner,
} from "@/lib/baby-home-section-pending";
import {
  BABY_CARE_TIMER_CLIENT_ID,
  babyBreastElapsedSec,
  emptyBabyCareTimerSlots,
  readBabyCareTimerSlots,
  withCareTimerSide,
  writeBabyCareTimerSlots,
  type BabyCareTimer,
  type BabyCareTimerSide,
  type BabyCareTimerSlots,
} from "@/lib/baby-breast-timer-store";
import {
  isBabyBirthDatePromptVisitDismissed,
  shouldShowBabyBirthDatePrompt,
} from "@/lib/baby-birth-date-prompt";
import {
  formatBabyDurationLocale,
  formatBabyDurationTimer,
} from "@/lib/baby-format-duration";
import {
  attachBabyLocalDayRoll,
  babyLocalDayWindow,
  nextBabyLocalDayIfChanged,
} from "@/lib/baby-home-day-window";
import {
  BABY_HOME_EMPHASIS_CLASS,
  BABY_HOME_QUIET_CLASS,
  babyHomeDiaperDetailMarked,
  babyHomeFeedDetailMarked,
  babyHomePumpDetailMarked,
  fillBabyHomeTemplate,
  renderBabyHomeMarkedSentence,
} from "@/lib/baby-home-marked-sentence";
import { formatBabyHomeWhenInline } from "@/lib/baby-home-when-inline";
import {
  babyNextDiaperDue,
  babyNextFeedDue,
  babyNextSleepDue,
  type BabyNextDue,
} from "@/lib/baby-next-due";
import {
  babyHomeSaveAnnouncement,
  classifyBabyQuickCareError,
  softInvalidateAfterQuickCare,
} from "@/lib/baby-quick-care-outcome";
import {
  localAfterFromQuickRequest,
  planBabyQuickCare,
} from "@/lib/baby-quick-care-plan";
import {
  adoptBabyHomeFeedSessionAfterQuickCare,
  readBabyHomeFeedSession,
  writeBabyHomeFeedSession,
} from "@/lib/baby-home-feed-session";
import type { BabyFeedSessionHandle } from "@/lib/baby-feed-session-store";
import {
  babyQuickCareRetryPayload,
  babyQuickPendingOwner,
  babyQuickPendingRecoveryVisible,
  babyQuickPendingView,
  clearBabyQuickPending,
  readBabyQuickPending,
  writeBabyQuickPending,
  type BabyQuickPending,
  type BabyQuickPendingOwnerId,
} from "@/lib/baby-quick-care-pending";
import { newBabyQuickRequestId } from "@/lib/baby-quick-care-request-id";
import {
  planBabyDiaperKindTap,
  type BabyDiaperQuickPlan,
} from "@/lib/baby-diaper-quick-plan";
import {
  babyHomeCustomInitialMl,
  babyHomeCustomMlTapAction,
  ensureMlInBottleChips,
  babyHomeKeepFromCustomAfterAmountSuccess,
  resolveBabyHomeCustomSelected,
  resolveBabyHomeSelectedBottleMl,
} from "@/lib/baby-home-bottle-selection";
import {
  babyHomeClearCustomClockAfterSuccess,
  babyHomeCustomClockMutationVars,
  babyHomeIsoToLocalInput,
  babyHomeNapEndedAtIso,
  clearBabyHomeCustomClockPending,
  type BabyHomeCustomClockTarget,
} from "@/lib/baby-home-custom-time";
import {
  babyHomeBottleDoneMl,
  babyHomeBreastDoneSide,
  babyHomeDiaperDoneKind,
  babyHomeSleepDoneFlash,
  createBabyHomeDoneFlashTimer,
} from "@/lib/baby-home-done-flash";
import type { BabyDiaperKind } from "@/lib/baby-diaper-detail";
import {
  babyHomeQuickStatusQueryOptions,
  babyQuickCareMutationOptions,
  invalidateBabyQueries,
  type BabyHomeQuickStatusData,
} from "@/lib/baby-query-options";
import { cn } from "@/lib/cn";
import { SHELL_DASHBOARD_STACK, SHELL_FULL_SPAN } from "@/lib/shell-layout";

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

/** Section lead + marked sentence body (facts bold, glue muted). */
function BabyHomeSectionHeading({
  testId,
  headingId,
  lead,
  bodyMarked,
}: {
  testId: string;
  headingId: string;
  lead: string;
  bodyMarked: string | null;
}) {
  return (
    <header data-testid={testId} className="text-sm text-foreground">
      <h2 id={headingId} className="inline text-sm text-foreground">
        <strong className={BABY_HOME_EMPHASIS_CLASS}>{lead}</strong>
        {bodyMarked ? (
          <>
            <span className={BABY_HOME_QUIET_CLASS}> — </span>
            {renderBabyHomeMarkedSentence(bodyMarked)}
          </>
        ) : null}
      </h2>
    </header>
  );
}

function dueBodyMarked(
  due: BabyNextDue,
  keys: { next: string; overdue: string },
  t: (key: string) => string,
  locale: "en" | "vi",
): string | null {
  if (due.kind === "hidden") return null;
  if (due.kind === "next") {
    const duration = formatBabyDurationLocale(due.remainingMs / 1000, locale);
    return fillBabyHomeTemplate(t(keys.next), { duration });
  }
  const duration = formatBabyDurationLocale(due.overdueMs / 1000, locale);
  return fillBabyHomeTemplate(t(keys.overdue), { duration });
}

/** 1 Hz tick isolated from next-due / status tree (≥30s parent clock). */
function BabyBreastElapsedText({
  startedAt,
  frozenNow,
}: {
  startedAt: number;
  /** Injected clock for tests — skips interval. */
  frozenNow?: number;
}) {
  const [now, setNow] = useState(() => frozenNow ?? Date.now());
  useEffect(() => {
    if (frozenNow != null) {
      setNow(frozenNow);
      return;
    }
    const id = setInterval(() => setNow(Date.now()), 1000);
    const onWake = () => setNow(Date.now());
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
    };
  }, [frozenNow]);
  return formatBabyDurationTimer(babyBreastElapsedSec(startedAt, now));
}

export type BabyHomeContentProps = {
  status: BabyHomeQuickStatusData["babyHomeQuickStatus"] | null;
  statusLoading: boolean;
  statusError: boolean;
  onRetryStatus: () => void;
  babyId: string;
  t: (key: string) => string;
  locale: "en" | "vi";
  /** Injected clock for tests. */
  nowMs?: number;
  /** Query dayKey from BabyHome (single source of truth for fetch window). */
  dayKey?: string;
  pendingSeed?: BabyQuickPending | null;
  /** Optional — unit tests omit this (no QueryClient). */
  onInvalidateCare?: () => Promise<void>;
  /** Optional — birthday modal save refreshes status/title. */
  onInvalidateProfile?: () => Promise<void>;
  /**
   * Injected visit-dismiss for markup tests (SSR sessionStorage is always false).
   * When true, birthday modal stays closed.
   */
  visitDismissedSeed?: boolean;
  /** Injected banner message for markup tests (fail-closed saveBlocked). */
  messageSeed?: string | null;
  /** Injected saving flag for markup tests (quiet mid-flight recovery). */
  savingSeed?: boolean;
  /** Injected bottle done-flash ml for markup tests (Task 8 flash wiring). */
  bottleDoneMlSeed?: number | null;
  /** Injected breast Done flash side for markup tests. */
  breastDoneSideSeed?: BabyCareTimerSide | null;
  /** Injected nap Done flash for markup tests. */
  sleepDoneSeed?: boolean;
};

export function BabyHomeContent({
  status,
  statusLoading,
  statusError,
  onRetryStatus,
  babyId,
  t,
  locale,
  nowMs,
  dayKey: dayKeyProp,
  pendingSeed = null,
  onInvalidateCare,
  onInvalidateProfile,
  visitDismissedSeed,
  messageSeed = null,
  savingSeed = false,
  bottleDoneMlSeed = null,
  breastDoneSideSeed = null,
  sleepDoneSeed = false,
}: BabyHomeContentProps) {
  const inFlightRef = useRef(false);
  const bottleDoneTimerRef = useRef(createBabyHomeDoneFlashTimer());
  const diaperDoneTimerRef = useRef(createBabyHomeDoneFlashTimer());
  const breastDoneTimerRef = useRef(createBabyHomeDoneFlashTimer());
  const pumpDoneTimerRef = useRef(createBabyHomeDoneFlashTimer());
  const sleepDoneTimerRef = useRef(createBabyHomeDoneFlashTimer());
  const [saving, setSaving] = useState(() => savingSeed);
  const [savingOwner, setSavingOwner] =
    useState<BabyQuickPendingOwnerId | null>(null);
  const [message, setMessage] = useState<string | null>(() => messageSeed);
  const [clock, setClock] = useState(() => nowMs ?? Date.now());
  const dayKey =
    dayKeyProp ??
    babyLocalDayWindow(new Date(nowMs ?? Date.now())).dayKey;
  const [careSlots, setCareSlots] = useState<BabyCareTimerSlots>(() => {
    // Hydrate-safe: never read localStorage in useState (SSR empty ≠ client LS).
    return emptyBabyCareTimerSlots(babyId);
  });
  const breast: BabyCareTimer | null = careSlots.breast
    ? {
        babyId: careSlots.babyId,
        side: careSlots.breast.side,
        startedAt: careSlots.breast.startedAt,
      }
    : null;
  const pumpTimer: BabyCareTimer | null = careSlots.pump
    ? {
        babyId: careSlots.babyId,
        side: careSlots.pump.side,
        startedAt: careSlots.pump.startedAt,
      }
    : null;
  const [breastStale, setBreastStale] = useState(false);
  const [pumpStale, setPumpStale] = useState(false);
  const [feedSession, setFeedSession] = useState<BabyFeedSessionHandle | null>(
    null,
  );
  const [formulaOverride, setFormulaOverride] = useState<number | null>(null);
  // Modal Confirm sets this so in-band values (e.g. 95) still show Custom selected.
  const [formulaFromCustom, setFormulaFromCustom] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [diaperSheet, setDiaperSheet] = useState<{
    diaperKind: "dirty" | "mixed";
  } | null>(null);
  const [bottleDoneMl, setBottleDoneMl] = useState<number | null>(
    () => bottleDoneMlSeed,
  );
  const [diaperDoneKind, setDiaperDoneKind] = useState<BabyDiaperKind | null>(
    null,
  );
  const [breastDoneSide, setBreastDoneSide] = useState<
    BabyCareTimerSide | null
  >(() => breastDoneSideSeed);
  const [pumpAmountDoneMl, setPumpAmountDoneMl] = useState<number | null>(null);
  const [pumpAmountOverride, setPumpAmountOverride] = useState<number | null>(
    null,
  );
  const [pumpAmountFromCustom, setPumpAmountFromCustom] = useState(false);
  const [pumpCustomOpen, setPumpCustomOpen] = useState(false);
  const [napCustomTimeIso, setNapCustomTimeIso] = useState<string | null>(null);
  const [napCustomDurationMinutes, setNapCustomDurationMinutes] = useState<
    number | null
  >(null);
  const [diaperCustomTimeIso, setDiaperCustomTimeIso] =
    useState<string | null>(null);
  const diaperCustomTimeIsoRef = useRef<string | null>(null);
  diaperCustomTimeIsoRef.current = diaperCustomTimeIso;
  const [formulaCustomIso, setFormulaCustomIso] = useState<string | null>(null);
  const [pumpCustomIso, setPumpCustomIso] = useState<string | null>(null);
  const [customTimeModal, setCustomTimeModal] = useState<{
    target: BabyHomeCustomClockTarget;
  } | null>(null);
  const [sleepDone, setSleepDone] = useState(() => sleepDoneSeed);
  const [openSleepOverride, setOpenSleepOverride] = useState<
    BabyHomeQuickStatusData["babyHomeQuickStatus"]["openSleep"] | undefined
  >(undefined);
  const [pending, setPending] = useState<BabyQuickPending | null>(() => {
    // Hydrate-safe: pendingSeed for tests; else null until mount re-read.
    return pendingSeed ?? null;
  });
  const [visitDismissed, setVisitDismissed] = useState(
    () => visitDismissedSeed ?? false,
  );
  const [birthDraft, setBirthDraft] = useState("");
  const [birthError, setBirthError] = useState<string | null>(null);
  const [birthSaving, setBirthSaving] = useState(false);

  const birthDate = status?.birthDate ?? null;
  const ageDays = babyAgeInDays(birthDate, new Date(clock));
  const band = babyFeedGuideForAge(ageDays);
  const formulaDefault = babySuggestedBottleMl({
    ageDays,
    weightKg: status?.latestWeightKg ?? null,
  });
  const bandKey = `${band.mlMin}-${band.mlMax}-${birthDate ?? ""}-${status?.latestWeightKg ?? ""}`;
  const [prevBandKey, setPrevBandKey] = useState(bandKey);
  if (prevBandKey !== bandKey) {
    setPrevBandKey(bandKey);
    setFormulaOverride(null);
    setFormulaFromCustom(false);
  }
  const napOpen =
    openSleepOverride !== undefined
      ? openSleepOverride != null
      : status?.openSleep != null;

  const selectedBottleMlBase = resolveBabyHomeSelectedBottleMl({
    bottleDoneMl,
    formulaFromCustom,
    formulaOverride,
  });

  const bottleChipMlsBase = buildBabyBottleChipMls({
    recentBottleMl: status?.recentBottleMl ?? [],
    snaps: birthDate
      ? babyBottleSnapsForBand(band)
      : [...BABY_BOTTLE_CHIPS_NO_BIRTH_SNAPS],
    limit: 3,
  });
  // Pending Custom / flash amount must appear as a tappable chip.
  const bottleEnsureMlBase =
    formulaFromCustom && formulaOverride != null && formulaOverride > 0
      ? formulaOverride
      : bottleDoneMl;
  const formulaMl = babyHomeCustomInitialMl({
    formulaOverride,
    birthDate,
    suggestedMl: formulaDefault,
    firstChipMl: bottleChipMlsBase[0] ?? null,
  });

  const nextFeedDue = babyNextFeedDue({
    now: clock,
    ageDays,
    lastFeedAt: status?.lastFeed?.at
      ? Date.parse(status.lastFeed.at)
      : null,
    lastFeedMethod:
      ((status?.lastFeed?.payload as { method?: string } | null)?.method as
        | "breast_l"
        | "breast_r"
        | "formula"
        | "pump"
        | "pump_l"
        | "pump_r"
        | null) ?? null,
  });

  const nextSleepDue = babyNextSleepDue({
    now: clock,
    ageDays,
    lastSleepEndedAt: status?.lastSleep?.endedAt
      ? Date.parse(status.lastSleep.endedAt)
      : null,
    napOpen,
  });

  const nextDiaperDue = babyNextDiaperDue({
    now: clock,
    ageDays,
    lastDiaperAt: status?.lastDiaper?.at
      ? Date.parse(status.lastDiaper.at)
      : null,
  });

  const sleepBand = babySleepGuideForAge(ageDays);

  // Next-due / relative labels: ≥30s; breast elapsed ticks in its own child.
  useEffect(() => {
    if (nowMs != null) return;
    const id = setInterval(() => setClock(Date.now()), 30_000);
    const onWake = () => setClock(Date.now());
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
    };
  }, [nowMs]);

  // Done/Logged flash timeouts — clear on unmount so setState never fires after leave.
  useEffect(() => {
    const bottleTimer = bottleDoneTimerRef.current;
    const diaperTimer = diaperDoneTimerRef.current;
    const breastTimer = breastDoneTimerRef.current;
    const pumpTimer = pumpDoneTimerRef.current;
    const sleepTimer = sleepDoneTimerRef.current;
    return () => {
      bottleTimer.dispose();
      diaperTimer.dispose();
      breastTimer.dispose();
      pumpTimer.dispose();
      sleepTimer.dispose();
    };
  }, []);

  // SSR init is null; re-read localStorage after mount so pending / breast survive hydrate.
  useEffect(() => {
    if (pendingSeed) return;
    try {
      const loadedRaw = readBabyQuickPending(localStorage, { babyId });
      // Too-old: Retry is gone. Clear on mount so recovery chrome does not
      // stick on every visit (same-session tooOld still via pendingSeed/clock).
      let loaded = loadedRaw;
      if (
        loaded &&
        babyQuickPendingView(loaded, Date.now()).kind === "tooOld"
      ) {
        clearBabyQuickPending(localStorage);
        loaded = null;
      }
      setPending(loaded);
    } catch {
      setPending(null);
    }
    try {
      const parsed = readBabyCareTimerSlots(localStorage, {
        babyId,
        now: Date.now(),
      });
      setCareSlots(parsed?.slots ?? emptyBabyCareTimerSlots(babyId));
      setBreastStale(parsed?.breastStale ?? false);
      setPumpStale(parsed?.pumpStale ?? false);
    } catch {
      setCareSlots(emptyBabyCareTimerSlots(babyId));
      setBreastStale(false);
      setPumpStale(false);
    }
    setFeedSession(
      readBabyHomeFeedSession(localStorage, {
        babyId,
        now: Date.now(),
      }),
    );
  }, [babyId, pendingSeed]);

  // Visit dismiss lives in sessionStorage — read after mount (SSR always false).
  useEffect(() => {
    if (visitDismissedSeed != null) return;
    try {
      setVisitDismissed(isBabyBirthDatePromptVisitDismissed(sessionStorage));
    } catch {
      setVisitDismissed(false);
    }
  }, [visitDismissedSeed]);

  const pendingView = babyQuickPendingView(pending, clock);
  const recoveryVisible = babyQuickPendingRecoveryVisible({
    saving,
    view: pendingView,
  });
  const pendingOwner: BabyQuickPendingOwnerId | null =
    pendingView.kind !== "none"
      ? babyQuickPendingOwner(pendingView.pending.request.action)
      : null;
  // Remount / orphaned pending: highlight stored ml under bottle / pump amount.
  const recoveryAmountMl =
    recoveryVisible &&
    pendingView.kind !== "none" &&
    (pendingView.pending.request.action.kind === "FORMULA" ||
      pendingView.pending.request.action.kind === "PUMP_AMOUNT")
      ? pendingView.pending.request.action.amountMl
      : null;
  const selectedBottleMl =
    recoveryVisible && pendingOwner === "bottle" && recoveryAmountMl != null
      ? recoveryAmountMl
      : selectedBottleMlBase;
  const bottleCustomSelected = resolveBabyHomeCustomSelected({
    fromCustom: formulaFromCustom,
    override: formulaOverride,
    doneMl: bottleDoneMl,
  });
  const bottleChipMls = ensureMlInBottleChips(
    bottleChipMlsBase,
    recoveryVisible && pendingOwner === "bottle"
      ? (recoveryAmountMl ?? bottleEnsureMlBase)
      : bottleEnsureMlBase,
  );

  function renderPendingRecovery(owner: BabyQuickPendingOwnerId): ReactNode {
    if (!recoveryVisible || pendingOwner !== owner || pendingView.kind === "none") {
      return null;
    }
    const record = pendingView.pending;
    if (pendingView.kind === "tooOld") {
      return (
        <div
          data-testid="baby-home-pending-recovery"
          data-pending-owner={owner}
          role="status"
          aria-live="polite"
          className="flex flex-nowrap items-center gap-x-3 overflow-x-auto"
        >
          <p className="shrink-0 text-sm text-destructive">{t("home.pendingTooOld")}</p>
          <Link
            href="/baby/activities"
            className="inline-flex min-h-11 items-center text-sm text-accent"
          >
            {t("home.pendingTimelineLink")}
          </Link>
          <button
            type="button"
            className="min-h-11 rounded-[var(--radius-sm)] px-3 text-sm"
            onClick={clearPending}
          >
            {t("home.pendingDiscard")}
          </button>
        </div>
      );
    }
    return (
      <div
        data-testid="baby-home-pending-recovery"
        data-pending-owner={owner}
        role="status"
        aria-live="polite"
        className="flex flex-nowrap items-center gap-x-3 overflow-x-auto"
      >
        <p className="shrink-0 text-sm text-destructive">{t("home.pendingTitle")}</p>
        <button
          type="button"
          className="min-h-11 rounded-[var(--radius-sm)] px-3 text-sm text-accent"
          onClick={() => void runQuick(record.request.action, record)}
        >
          {t("home.pendingRetry")}
        </button>
        <button
          type="button"
          className="min-h-11 rounded-[var(--radius-sm)] px-3 text-sm"
          onClick={clearPending}
        >
          {t("home.pendingDiscard")}
        </button>
      </div>
    );
  }

  function renderSectionFooter(opts: {
    owners: readonly BabyQuickPendingOwnerId[];
    ageTip: ReactNode;
    statusFail?: ReactNode;
  }): ReactNode {
    const sectionOwner = babyHomePickSectionPendingOwner(
      pendingOwner ? [pendingOwner] : [],
      opts.owners,
    );
    if (sectionOwner != null && recoveryVisible) {
      return renderPendingRecovery(sectionOwner);
    }
    if (opts.statusFail != null) return opts.statusFail;
    return opts.ageTip;
  }

  const showBirthModal =
    !statusError &&
    !statusLoading &&
    status != null &&
    shouldShowBabyBirthDatePrompt({
      birthDate,
      visitDismissed,
    });

  async function saveBirthDateFromModal() {
    setBirthSaving(true);
    setBirthError(null);
    const result = await saveBabyBirthDateFromModal({
      birthDate: birthDraft,
      request: babyGraphQLRequest as never,
      onInvalidateProfile,
      visitStorage:
        typeof window !== "undefined" ? sessionStorage : undefined,
    });
    if (result.ok) {
      setBirthDraft("");
      setVisitDismissed(true);
    } else {
      setBirthError(t(result.errorKey as never));
    }
    setBirthSaving(false);
  }

  function dismissBirthModal() {
    setVisitDismissed(true);
    setBirthError(null);
    if (typeof window !== "undefined") {
      dismissBabyBirthDateModalVisit(sessionStorage);
    }
  }

  async function persistPending(record: BabyQuickPending): Promise<boolean> {
    if (typeof window === "undefined") return false;
    return writeBabyQuickPending(localStorage, record);
  }

  function clearPending() {
    setPending(null);
    if (typeof window === "undefined") return;
    clearBabyQuickPending(localStorage);
  }

  function writeCareSlots(next: BabyCareTimerSlots) {
    setCareSlots(next);
    setBreastStale(false);
    setPumpStale(false);
    try {
      writeBabyCareTimerSlots(localStorage, next);
    } catch {
      /* ignore */
    }
  }

  function writeFeedSession(next: BabyFeedSessionHandle | null) {
    setFeedSession(next);
    if (typeof window !== "undefined") {
      writeBabyHomeFeedSession(localStorage, next);
    }
  }

  async function runQuick(
    action: Parameters<typeof planBabyQuickCare>[0],
    reuse?: BabyQuickPending,
  ) {
    // Sync lock first — two taps in one frame share this ref (before any yield).
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setSaving(true);
    setSavingOwner(babyQuickPendingOwner(action));
    setMessage(null);
    // Capture Custom-origin at call time (feed/pump form pattern) — do not re-read after await.
    const formulaFromCustomAtCall = formulaFromCustom;
    const pumpAmountFromCustomAtCall = pumpAmountFromCustom;
    const formulaCustomIsoAtCall = formulaCustomIso;
    const pumpCustomIsoAtCall = pumpCustomIso;
    const napWasOpenAtCall = napOpen;
    const napCustomTimeIsoAtCall = napCustomTimeIso;
    const napCustomDurationAtCall = napCustomDurationMinutes;
    const diaperCustomTimeIsoAtCall = diaperCustomTimeIsoRef.current;

    const sessionHandle =
      typeof window !== "undefined"
        ? readBabyHomeFeedSession(localStorage, { babyId, now: clock })
        : feedSession;

    const planned = reuse
      ? {
          request: reuse.request,
          localAfter: localAfterFromQuickRequest(reuse.request),
        }
      : planBabyQuickCare(action, {
          breastSlot: careSlots.breast,
          pumpSlot: careSlots.pump,
          now: clock,
          feedSessionEventId: sessionHandle?.eventId ?? null,
        });
    // Attach pending Custom clock (Nap/Diaper) per field map; Bottle/Pump Custom → occurredAt.
    if (!reuse) {
      if (action.kind === "SLEEP") {
        const clockVars = babyHomeCustomClockMutationVars({
          pendingIso: napCustomTimeIsoAtCall,
          target: "nap",
          napRunning: napWasOpenAtCall,
        });
        planned.request = { ...planned.request, ...clockVars };
      } else if (action.kind === "DIAPER") {
        const clockVars = babyHomeCustomClockMutationVars({
          pendingIso: diaperCustomTimeIsoAtCall,
          target: "diaper",
        });
        planned.request = { ...planned.request, ...clockVars };
      } else if (
        action.kind === "FORMULA" &&
        formulaFromCustomAtCall &&
        formulaCustomIsoAtCall
      ) {
        planned.request = {
          ...planned.request,
          occurredAt: formulaCustomIsoAtCall,
        };
      } else if (
        action.kind === "PUMP_AMOUNT" &&
        pumpAmountFromCustomAtCall &&
        pumpCustomIsoAtCall
      ) {
        planned.request = {
          ...planned.request,
          occurredAt: pumpCustomIsoAtCall,
        };
      }
    }
    const retry = reuse ? babyQuickCareRetryPayload(reuse) : null;
    const requestId = retry?.clientRequestId ?? newBabyQuickRequestId();
    const record: BabyQuickPending = reuse ?? {
      babyId,
      requestId,
      request: planned.request,
      state: "sending",
      startedAt: clock,
    };
    const wireRequest = retry?.request ?? record.request;

    const ok = await persistPending(record);
    if (!ok) {
      setMessage(t("home.saveBlocked"));
      inFlightRef.current = false;
      setSaving(false);
      setSavingOwner(null);
      return;
    }
    setPending(record);

    try {
      const mut = babyQuickCareMutationOptions();
      const data = await mut.mutationFn({
        request: wireRequest,
        clientRequestId: record.requestId,
      });
      const result = data.babyQuickCare;
      clearPending();
      // First press and Retry both apply localAfter after a confirmed response.
      let nextSlots = careSlots;
      if (planned.localAfter.clearBreastTimer) {
        nextSlots = withCareTimerSide(nextSlots, {
          babyId,
          side: null,
          now: clock,
          clearFamily: "breast",
        });
      }
      if (planned.localAfter.startBreastSide) {
        nextSlots = withCareTimerSide(nextSlots, {
          babyId,
          side: planned.localAfter.startBreastSide,
          now: clock,
        });
      }
      if (planned.localAfter.clearPumpTimer) {
        nextSlots = withCareTimerSide(nextSlots, {
          babyId,
          side: null,
          now: clock,
          clearFamily: "pump",
        });
      }
      if (planned.localAfter.startPumpSide) {
        nextSlots = withCareTimerSide(nextSlots, {
          babyId,
          side: planned.localAfter.startPumpSide,
          now: clock,
        });
      }
      writeCareSlots(nextSlots);
      writeFeedSession(
        adoptBabyHomeFeedSessionAfterQuickCare({
          babyId,
          now: clock,
          previous: sessionHandle,
          localAfter: planned.localAfter,
          steps: result.steps,
        }),
      );
      if (result.openSleep !== undefined) {
        setOpenSleepOverride(result.openSleep);
      }
      if (record.request.action.kind === "FORMULA") {
        const doneMl = babyHomeBottleDoneMl(record.request.action.amountMl);
        const keepFromCustom = babyHomeKeepFromCustomAfterAmountSuccess({
          fromCustom: formulaFromCustomAtCall,
          doneMl,
        });
        setFormulaOverride(null);
        setFormulaFromCustom(keepFromCustom);
        if (!keepFromCustom) setFormulaCustomIso(null);
        else if (formulaCustomIsoAtCall) {
          setFormulaCustomIso(formulaCustomIsoAtCall);
        }
        if (doneMl != null) {
          setBottleDoneMl(doneMl);
          bottleDoneTimerRef.current.arm(() => {
            setBottleDoneMl(null);
            setFormulaFromCustom(false);
            setFormulaCustomIso(null);
          });
        }
      }
      if (record.request.action.kind === "PUMP_AMOUNT") {
        const doneMl = babyHomeBottleDoneMl(record.request.action.amountMl);
        const keepFromCustom = babyHomeKeepFromCustomAfterAmountSuccess({
          fromCustom: pumpAmountFromCustomAtCall,
          doneMl,
        });
        setPumpAmountOverride(null);
        setPumpAmountFromCustom(keepFromCustom);
        if (!keepFromCustom) setPumpCustomIso(null);
        else if (pumpCustomIsoAtCall) {
          setPumpCustomIso(pumpCustomIsoAtCall);
        }
        if (doneMl != null) {
          setPumpAmountDoneMl(doneMl);
          pumpDoneTimerRef.current.arm(() => {
            setPumpAmountDoneMl(null);
            setPumpAmountFromCustom(false);
            setPumpCustomIso(null);
          });
        }
      }
      if (record.request.action.kind === "DIAPER") {
        const dk = babyHomeDiaperDoneKind(
          record.request.action.diaperKind,
        );
        setDiaperSheet(null);
        if (
          babyHomeClearCustomClockAfterSuccess({
            pendingTarget: diaperCustomTimeIso ? "diaper" : null,
            savedTarget: "diaper",
          })
        ) {
          setDiaperCustomTimeIso(clearBabyHomeCustomClockPending());
        }
        if (dk) {
          setDiaperDoneKind(dk);
          diaperDoneTimerRef.current.arm(() => setDiaperDoneKind(null));
        }
      }
      if (record.request.action.kind === "BREAST") {
        const side = babyHomeBreastDoneSide({
          stopBreastSession:
            planned.localAfter.stopBreastSession ||
            planned.localAfter.stopPumpSession,
          side: record.request.action.side,
        });
        if (side) {
          setBreastDoneSide(side);
          breastDoneTimerRef.current.arm(() => setBreastDoneSide(null));
        }
      }
      if (record.request.action.kind === "SLEEP") {
        let endedSleepSession = result.steps.some((s) => s.step === "endNap");
        // Start nap with pending duration → immediately end at start+duration.
        if (
          !napWasOpenAtCall &&
          !endedSleepSession &&
          napCustomTimeIsoAtCall &&
          napCustomDurationAtCall != null &&
          napCustomDurationAtCall > 0
        ) {
          const endIso = babyHomeNapEndedAtIso({
            startIso: napCustomTimeIsoAtCall,
            durationMinutes: napCustomDurationAtCall,
          });
          const endRequestId = newBabyQuickRequestId();
          const endData = await mut.mutationFn({
            request: {
              action: { kind: "SLEEP" },
              breastRunning: null,
              endedAt: endIso,
            },
            clientRequestId: endRequestId,
          });
          const endResult = endData.babyQuickCare;
          if (endResult.openSleep !== undefined) {
            setOpenSleepOverride(endResult.openSleep);
          }
          endedSleepSession = endResult.steps.some((s) => s.step === "endNap");
        }
        if (
          babyHomeClearCustomClockAfterSuccess({
            pendingTarget: napCustomTimeIsoAtCall ? "nap" : null,
            savedTarget: "nap",
          })
        ) {
          setNapCustomTimeIso(clearBabyHomeCustomClockPending());
          setNapCustomDurationMinutes(null);
        }
        if (babyHomeSleepDoneFlash({ endedSleepSession })) {
          setSleepDone(true);
          sleepDoneTimerRef.current.arm(() => setSleepDone(false));
        }
      }
      // Quiet success — chip done-flash only; no Saved … banner.
      // Paint confirmation before soft-invalidate (refetch can be slow).
      setSaving(false);
      setSavingOwner(null);
      // Refetch failures must not undo confirmed success (Done flash).
      await softInvalidateAfterQuickCare(onInvalidateCare);
    } catch (error) {
      const cls = classifyBabyQuickCareError(error);
      if (cls === "definiteNoCommit") {
        clearPending();
        setMessage(t("home.chainFailed"));
      } else {
        const unknown: BabyQuickPending = { ...record, state: "unknown" };
        setPending(unknown);
        void writeBabyQuickPending(localStorage, unknown);
        // Under-owner recovery carries the failure copy — skip status shout.
      }
    } finally {
      inFlightRef.current = false;
      setSaving(false);
      setSavingOwner(null);
    }
  }

  const breastElapsed = breast ? (
    <BabyBreastElapsedText startedAt={breast.startedAt} frozenNow={nowMs} />
  ) : null;
  const pumpElapsed = pumpTimer ? (
    <BabyBreastElapsedText startedAt={pumpTimer.startedAt} frozenNow={nowMs} />
  ) : null;

  function statusKindIcon(kind: "feed" | "sleep" | "diaper" | "pump"): ReactNode {
    if (kind === "sleep") {
      return <IconBabySleep className="mt-0.5 size-5 shrink-0" aria-hidden />;
    }
    if (kind === "diaper") {
      return <IconBabyDiaper className="mt-0.5 size-5 shrink-0" aria-hidden />;
    }
    if (kind === "pump") {
      return <IconBabyPump className="mt-0.5 size-5 shrink-0" aria-hidden />;
    }
    const method = (
      status?.lastFeed?.payload as { method?: string } | null | undefined
    )?.method;
    if (
      method === "breast_l" ||
      method === "breast_r" ||
      method === "breast"
    ) {
      return <IconBabyBreast className="mt-0.5 size-5 shrink-0" aria-hidden />;
    }
    return <IconBabyBottle className="mt-0.5 size-5 shrink-0" aria-hidden />;
  }

  function statusLine(
    kind: "feed" | "sleep" | "diaper" | "pump",
  ): ReactNode {
    if (statusLoading) {
      return <p className="text-sm text-muted">{t("common.loading")}</p>;
    }
    if (statusError) {
      return <p className="text-sm text-muted">{t("home.statusError")}</p>;
    }
    if (!status) {
      return (
        <p className="text-sm text-muted">
          {t(
            kind === "feed"
              ? "home.status.feedEmpty"
              : kind === "sleep"
                ? "home.status.sleepEmpty"
                : kind === "pump"
                  ? "home.status.pumpEmpty"
                  : "home.status.diaperEmpty",
          )}
        </p>
      );
    }
    if (kind === "feed") {
      const item = status.lastFeed;
      if (!item) {
        return (
          <p className="text-sm text-muted">{t("home.status.feedEmpty")}</p>
        );
      }
      const when = formatBabyHomeWhenInline(
        item.at,
        t,
        new Date(clock),
        locale,
      );
      const detail = babyHomeFeedDetailMarked({
        summary: item.summary,
        payload: item.payload,
        t,
      });
      if (!detail) {
        return (
          <p className="text-sm text-muted">{t("home.status.feedEmpty")}</p>
        );
      }
      const marked = fillBabyHomeTemplate(t("home.status.feedItem"), {
        detail,
        when,
      });
      return (
        <p className="text-sm text-foreground">
          {renderBabyHomeMarkedSentence(marked)}
        </p>
      );
    }
    if (kind === "sleep") {
      const open = openSleepOverride ?? status.openSleep;
      if (open) {
        const elapsed = formatBabyDurationTimer(
          Math.max(
            0,
            Math.floor((clock - Date.parse(open.occurredAt)) / 1000),
          ),
        );
        const marked = fillBabyHomeTemplate(t("home.status.sleepOpen"), {
          elapsed,
        });
        return (
          <p className="text-sm text-foreground">
            {renderBabyHomeMarkedSentence(marked)}
          </p>
        );
      }
      const item = status.lastSleep;
      if (!item) {
        return (
          <p className="text-sm text-muted">{t("home.status.sleepEmpty")}</p>
        );
      }
      const when = formatBabyHomeWhenInline(
        item.endedAt ?? item.at,
        t,
        new Date(clock),
        locale,
      );
      const marked = fillBabyHomeTemplate(t("home.status.sleepEnded"), {
        when,
      });
      return (
        <p className="text-sm text-foreground">
          {renderBabyHomeMarkedSentence(marked)}
        </p>
      );
    }
    if (kind === "diaper") {
      const item = status.lastDiaper;
      if (!item) {
        return (
          <p className="text-sm text-muted">{t("home.status.diaperEmpty")}</p>
        );
      }
      const when = formatBabyHomeWhenInline(
        item.at,
        t,
        new Date(clock),
        locale,
      );
      const detail = babyHomeDiaperDetailMarked({
        summary: item.summary,
        payload: item.payload,
        t,
      });
      const marked = fillBabyHomeTemplate(t("home.status.diaperItem"), {
        detail,
        when,
      });
      return (
        <p className="text-sm text-foreground">
          {renderBabyHomeMarkedSentence(marked)}
        </p>
      );
    }

    const item = status.lastPump;
    if (!item) {
      return (
        <p className="text-sm text-muted">{t("home.status.pumpEmpty")}</p>
      );
    }
    const when = formatBabyHomeWhenInline(
      item.at,
      t,
      new Date(clock),
      locale,
    );
    const detail = babyHomePumpDetailMarked({
      summary: item.summary,
      payload: item.payload,
      t,
    });
    const marked = fillBabyHomeTemplate(t("home.status.pumpItem"), {
      detail,
      when,
    });
    return (
      <p className="text-sm text-foreground">
        {renderBabyHomeMarkedSentence(marked)}
      </p>
    );
  }

  const sleepFailClosed = statusError;

  function onDiaperPlan(plan: BabyDiaperQuickPlan) {
    if (plan.kind === "instantSave") {
      void runQuick({ kind: "DIAPER", diaperKind: plan.diaperKind });
      return;
    }
    setDiaperSheet({ diaperKind: plan.diaperKind });
  }

  let bottleBody: string | null = null;
  const birthBandKnown =
    birthDate != null &&
    band.feedsMax !== Number.POSITIVE_INFINITY &&
    Number.isFinite(band.feedsMax);
  if (!birthBandKnown) {
    bottleBody = t("home.header.bottleEmpty");
  }

  const careStage = babyCareGuideStageForAge(ageDays);

  const bottleFooterTip = birthBandKnown
    ? [
        fillBabyHomeTemplate(t("home.header.bottleMl"), {
          ml: String(formulaDefault),
        }),
        fillBabyHomeTemplate(t("home.header.bottleProgress"), {
          n: String(status?.feedsToday ?? 0),
          max: String(band.feedsMax),
        }),
      ].join(" ")
    : null;

  const breastSessions = babyBreastSessionGuideForAge(ageDays);
  const breastFooterTip = breastSessions
    ? fillBabyHomeTemplate(t("home.footer.breastFeeds"), {
        min: String(breastSessions.feedsMin),
        max: String(breastSessions.feedsMax),
      })
    : careStage === "m12_24"
      ? fillBabyHomeTemplate(t("home.footer.milkDaily"), {
          min: "350",
          max: "500",
        })
      : null;

  const napFooterTip = sleepBand ? t(sleepBand.blendKey) : null;

  const diaperFooterTip = careStage
    ? t(`home.footer.diaper.${careStage}`)
    : null;

  const pumpFooterTip = careStage
    ? t(`home.footer.pump.${careStage}`)
    : null;

  const napBody =
    dueBodyMarked(
      nextSleepDue,
      {
        next: "home.header.napNext",
        overdue: "home.header.napOverdue",
      },
      t,
      locale,
    ) ?? t("home.header.napEmpty");

  const breastBody =
    dueBodyMarked(
      nextFeedDue,
      {
        next: "home.header.breastNext",
        overdue: "home.header.breastOverdue",
      },
      t,
      locale,
    ) ??
    fillBabyHomeTemplate(t("home.header.breastEmpty"), {
      left: t("home.breastL"),
      right: t("home.breastR"),
    });

  const diaperBody =
    dueBodyMarked(
      nextDiaperDue,
      {
        next: "home.header.diaperNext",
        overdue: "home.header.diaperOverdue",
      },
      t,
      locale,
    ) ?? t("home.header.diaperEmpty");

  const selectedPumpMlBase = resolveBabyHomeSelectedBottleMl({
    bottleDoneMl: pumpAmountDoneMl,
    formulaFromCustom: pumpAmountFromCustom,
    formulaOverride: pumpAmountOverride,
  });
  const pumpChipMlsBase = bottleChipMlsBase;
  const pumpEnsureMlBase =
    pumpAmountFromCustom &&
    pumpAmountOverride != null &&
    pumpAmountOverride > 0
      ? pumpAmountOverride
      : pumpAmountDoneMl;
  const selectedPumpMl =
    recoveryVisible &&
    pendingOwner === "pump_amount" &&
    recoveryAmountMl != null
      ? recoveryAmountMl
      : selectedPumpMlBase;
  const pumpCustomSelected = resolveBabyHomeCustomSelected({
    fromCustom: pumpAmountFromCustom,
    override: pumpAmountOverride,
    doneMl: pumpAmountDoneMl,
  });
  const pumpChipMls = ensureMlInBottleChips(
    pumpChipMlsBase,
    recoveryVisible && pendingOwner === "pump_amount"
      ? (recoveryAmountMl ?? pumpEnsureMlBase)
      : pumpEnsureMlBase,
  );
  const pumpCustomMl = babyHomeCustomInitialMl({
    formulaOverride: pumpAmountOverride,
    birthDate,
    suggestedMl: formulaDefault,
    firstChipMl: pumpChipMlsBase[0] ?? null,
  });

  const guidelineModel = buildBabyCareGuidelineModel(
    (key) => t(key),
    locale,
  );

  const saveAnnouncement = babyHomeSaveAnnouncement({
    saving,
    message,
    savingLabel: t("home.saving"),
  });

  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "@container")}
      data-testid="baby-home"
      data-day-key={dayKey}
    >
      {/* Row 1: Breast L·R + Bottle — subgrid keeps control tops aligned */}
      <div
        data-layout="home-row-breast-bottle"
        data-section="row-feed"
        className="grid gap-x-3 gap-y-2 [grid-template-rows:auto_auto_auto]"
        style={{
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
        }}
      >
        <section
          aria-labelledby="baby-home-heading-breast"
          data-section="breast"
          className="row-span-3 grid min-w-0 grid-rows-subgrid gap-y-2"
        >
          <BabyHomeSectionHeading
            testId="baby-home-header-breast"
            headingId="baby-home-heading-breast"
            lead={t("home.header.breast")}
            bodyMarked={breastBody}
          />
          <BabyBreastSidePair
            sides={[
              {
                side: "breast_l",
                label: babyTimedCareChipLabel({
                  running: breast?.side === "breast_l",
                  idleLabel: t("home.breastL"),
                  endTitle: t("home.breastL"),
                  tapToStop: t("home.tapToStop"),
                }),
                running: breast?.side === "breast_l",
                elapsedText:
                  breast?.side === "breast_l" ? breastElapsed : undefined,
                tapToStart: t("home.tapToStart"),
                tapToStop: t("home.tapToStop"),
                subtitle:
                  breast?.side === "breast_l" && breastStale
                    ? fill(t("home.timerStaleNote"), {
                        time: new Date(breast!.startedAt).toLocaleTimeString(),
                      })
                    : undefined,
                disabled: savingOwner === "breast_l",
                doneText:
                  breastDoneSide === "breast_l" ? t("home.done") : null,
                onPress: () =>
                  void runQuick({ kind: "BREAST", side: "breast_l" }),
              },
              {
                side: "breast_r",
                label: babyTimedCareChipLabel({
                  running: breast?.side === "breast_r",
                  idleLabel: t("home.breastR"),
                  endTitle: t("home.breastR"),
                  tapToStop: t("home.tapToStop"),
                }),
                running: breast?.side === "breast_r",
                elapsedText:
                  breast?.side === "breast_r" ? breastElapsed : undefined,
                tapToStart: t("home.tapToStart"),
                tapToStop: t("home.tapToStop"),
                subtitle:
                  breast?.side === "breast_r" && breastStale
                    ? fill(t("home.timerStaleNote"), {
                        time: new Date(breast!.startedAt).toLocaleTimeString(),
                      })
                    : undefined,
                disabled: savingOwner === "breast_r",
                doneText:
                  breastDoneSide === "breast_r" ? t("home.done") : null,
                onPress: () =>
                  void runQuick({ kind: "BREAST", side: "breast_r" }),
              },
            ]}
          />
          <div data-section-footer="breast">
            {renderSectionFooter({
              owners: BABY_HOME_BREAST_PENDING_ORDER,
              ageTip: breastFooterTip ? (
                <p className="text-sm text-muted">
                  {renderBabyHomeMarkedSentence(breastFooterTip)}
                </p>
              ) : null,
            })}
          </div>
        </section>
        <section
          aria-labelledby="baby-home-heading-bottle"
          data-section="bottle"
          className="row-span-3 grid min-w-0 grid-rows-subgrid gap-y-2"
        >
          <div className="flex items-start gap-2">
            <IconBabyBottle className="mt-0.5 size-5 shrink-0" aria-hidden />
            <BabyHomeSectionHeading
              testId="baby-home-header-bottle"
              headingId="baby-home-heading-bottle"
              lead={t("home.header.bottle")}
              bodyMarked={bottleBody}
            />
          </div>
          <BabyMlChipSection
            mls={bottleChipMls}
            selectedMl={selectedBottleMl}
            doneFlash={bottleDoneMl != null}
            doneText={t("home.done")}
            disabled={savingOwner === "bottle"}
            customSelected={bottleCustomSelected}
            showEditCustom={bottleCustomSelected}
            onEditCustom={() => {
              if (savingOwner != null) return;
              setCustomOpen(true);
            }}
            onSelectMl={(ml) => {
              if (!(formulaFromCustom && formulaOverride === ml)) {
                setFormulaFromCustom(false);
                setFormulaCustomIso(null);
              }
              setFormulaOverride(ml);
              void runQuick({ kind: "FORMULA", amountMl: ml });
            }}
            onCustom={() => {
              if (savingOwner != null) return;
              if (
                babyHomeCustomMlTapAction({
                  fromCustom: formulaFromCustom,
                  override: formulaOverride,
                }) === "save"
              ) {
                void runQuick({
                  kind: "FORMULA",
                  amountMl: formulaOverride!,
                });
                return;
              }
              setCustomOpen(true);
            }}
            t={t}
          />
          <div data-section-footer="bottle">
            {renderSectionFooter({
              owners: ["bottle"],
              ageTip: bottleFooterTip ? (
                <p className="text-sm text-muted">
                  {renderBabyHomeMarkedSentence(bottleFooterTip)}
                </p>
              ) : null,
            })}
          </div>
        </section>
      </div>

      {/* Row 2: Nap + Custom(time); shared footer spans both columns */}
      <div
        data-layout="home-row-nap"
        className="grid gap-x-3 gap-y-2 [grid-template-rows:auto_auto_auto]"
        style={{
          // Fixed 2 cols — auto-fit + col-span-full footer keeps empty tracks and blocks stretch.
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        }}
      >
        <section
          aria-labelledby="baby-home-heading-nap"
          data-section="nap"
          className="row-span-2 grid min-w-0 grid-rows-subgrid gap-y-2"
        >
          <BabyHomeSectionHeading
            testId="baby-home-header-nap"
            headingId="baby-home-heading-nap"
            lead={t("home.header.nap")}
            bodyMarked={napBody}
          />
          {sleepFailClosed ? (
            <div
              data-testid="baby-care-chip-nap"
              data-nap-shell="fail"
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border p-3 opacity-60",
                BABY_HOME_BIG_CONTROL_MIN_H,
              )}
              aria-disabled
            >
              <IconBabySleep className="size-6" aria-hidden />
              <span className="text-sm text-muted">{t("home.sleepStart")}</span>
            </div>
          ) : (
            <BabyTimedCareChip
              data-testid="baby-care-chip-nap"
              labelId="baby-quick-sleep-label"
              label={babyTimedCareChipLabel({
                running: napOpen,
                idleLabel: t("home.sleepStart"),
                endTitle: t("home.sleepEnd"),
                tapToStop: t("home.tapToStop"),
              })}
              running={napOpen}
              elapsedText={
                napOpen ? (
                  <BabyBreastElapsedText
                    startedAt={Date.parse(
                      (openSleepOverride ?? status?.openSleep)!.occurredAt,
                    )}
                    frozenNow={nowMs}
                  />
                ) : undefined
              }
              tapToStart={t("home.tapToStart")}
              tapToStop={t("home.tapToStop")}
              disabled={savingOwner === "nap"}
              doneText={sleepDone ? t("home.done") : null}
              onPress={() => void runQuick({ kind: "SLEEP" })}
              icon={<IconBabySleep className="size-6" />}
            />
          )}
        </section>
        <section
          aria-label={t("home.customNap")}
          data-section="nap-custom-time"
          className="row-span-2 grid min-w-0 grid-rows-subgrid gap-y-2"
        >
          <div data-header-slot="empty" className="h-5" aria-hidden />
          <BabyCustomTimeChip
            data-testid="baby-care-chip-nap-custom-time"
            label={t("home.customNap")}
            valueText={
              napCustomTimeIso
                ? napCustomDurationMinutes != null
                  ? `${babyHomeIsoToLocalInput(napCustomTimeIso).slice(11)} · ${napCustomDurationMinutes}m`
                  : babyHomeIsoToLocalInput(napCustomTimeIso).slice(11)
                : ""
            }
            selected={napCustomTimeIso != null}
            disabled={savingOwner === "nap"}
            onPress={() => setCustomTimeModal({ target: "nap" })}
          />
        </section>
        <div
          data-section-footer="nap"
          className="col-span-full min-w-0"
        >
          {renderSectionFooter({
            owners: ["nap"],
            statusFail: sleepFailClosed ? (
              <div
                role="status"
                aria-live="polite"
                className="flex flex-nowrap items-center gap-x-3 overflow-x-auto"
              >
                <p className="shrink-0 text-sm text-muted">
                  {t("home.napCheckFailed")}
                </p>
                <button
                  type="button"
                  className="min-h-11 shrink-0 rounded-[var(--radius-sm)] px-3 text-sm text-accent"
                  onClick={onRetryStatus}
                >
                  {t("sleep.retryCheck")}
                </button>
              </div>
            ) : null,
            ageTip: napFooterTip ? (
              <p className="text-sm text-muted">
                {renderBabyHomeMarkedSentence(napFooterTip)}
              </p>
            ) : null,
          })}
        </div>
      </div>

      {/* Row 3: Diaper + Custom; shared footer spans both columns */}
      <div
        data-layout="home-row-diaper"
        className="grid gap-x-3 gap-y-2 [grid-template-rows:auto_auto_auto]"
        style={{
          // Fixed 2 cols — auto-fit + col-span-full footer keeps empty tracks and blocks stretch.
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        }}
      >
        <section
          aria-labelledby="baby-home-heading-diaper"
          data-section="diaper"
          className="row-span-2 grid min-w-0 grid-rows-subgrid gap-y-2"
        >
          <div className="flex items-start gap-2">
            <IconBabyDiaper className="mt-0.5 size-5 shrink-0" aria-hidden />
            <BabyHomeSectionHeading
              testId="baby-home-header-diaper"
              headingId="baby-home-heading-diaper"
              lead={t("home.header.diaper")}
              bodyMarked={diaperBody}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <BabyDiaperKindControl
              disabled={savingOwner === "diaper"}
              doneKind={diaperDoneKind}
              doneText={t("home.done")}
              onPlan={onDiaperPlan}
              t={t}
            />
          </div>
        </section>
        <section
          aria-label={t("home.customDiaper")}
          data-section="diaper-custom-time"
          className="row-span-2 grid min-w-0 grid-rows-subgrid gap-y-2"
        >
          <div data-header-slot="empty" className="h-5" aria-hidden />
          <BabyCustomTimeChip
            data-testid="baby-care-chip-diaper-custom-time"
            label={t("home.customDiaper")}
            valueText={
              diaperCustomTimeIso
                ? babyHomeIsoToLocalInput(diaperCustomTimeIso).slice(11)
                : ""
            }
            selected={diaperCustomTimeIso != null}
            disabled={savingOwner === "diaper"}
            onPress={() => setCustomTimeModal({ target: "diaper" })}
          />
        </section>
        <div
          data-section-footer="diaper"
          className="col-span-full min-w-0"
        >
          {renderSectionFooter({
            owners: ["diaper"],
            ageTip: diaperFooterTip ? (
              <p className="text-sm text-muted">{diaperFooterTip}</p>
            ) : null,
          })}
        </div>
      </div>

      {/* Row 4: Pump — 12rem L/R section + amount section (Breast width pattern) */}
      <div
        data-layout="home-row-pump"
        className="grid gap-x-3 gap-y-2 [grid-template-rows:auto_auto_auto]"
        style={{
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
        }}
      >
        <section
          aria-labelledby="baby-home-heading-pump"
          data-section="pump"
          className="row-span-3 grid min-w-0 grid-rows-subgrid gap-y-2"
        >
          <BabyHomeSectionHeading
            testId="baby-home-header-pump"
            headingId="baby-home-heading-pump"
            lead={t("home.header.pump")}
            bodyMarked={null}
          />
          <BabyPumpSidePair
            sides={[
              {
                side: "pump_l",
                label: babyTimedCareChipLabel({
                  running: pumpTimer?.side === "pump_l",
                  idleLabel: t("home.pumpL"),
                  endTitle: t("home.pumpL"),
                  tapToStop: t("home.tapToStop"),
                }),
                running: pumpTimer?.side === "pump_l",
                elapsedText:
                  pumpTimer?.side === "pump_l" ? pumpElapsed : undefined,
                tapToStart: t("home.tapToStart"),
                tapToStop: t("home.tapToStop"),
                subtitle:
                  pumpTimer?.side === "pump_l" && pumpStale
                    ? fill(t("home.timerStaleNote"), {
                        time: new Date(
                          pumpTimer!.startedAt,
                        ).toLocaleTimeString(),
                      })
                    : undefined,
                disabled: savingOwner === "pump_l",
                doneText:
                  breastDoneSide === "pump_l" ? t("home.done") : null,
                onPress: () =>
                  void runQuick({ kind: "BREAST", side: "pump_l" }),
              },
              {
                side: "pump_r",
                label: babyTimedCareChipLabel({
                  running: pumpTimer?.side === "pump_r",
                  idleLabel: t("home.pumpR"),
                  endTitle: t("home.pumpR"),
                  tapToStop: t("home.tapToStop"),
                }),
                running: pumpTimer?.side === "pump_r",
                elapsedText:
                  pumpTimer?.side === "pump_r" ? pumpElapsed : undefined,
                tapToStart: t("home.tapToStart"),
                tapToStop: t("home.tapToStop"),
                subtitle:
                  pumpTimer?.side === "pump_r" && pumpStale
                    ? fill(t("home.timerStaleNote"), {
                        time: new Date(
                          pumpTimer!.startedAt,
                        ).toLocaleTimeString(),
                      })
                    : undefined,
                disabled: savingOwner === "pump_r",
                doneText:
                  breastDoneSide === "pump_r" ? t("home.done") : null,
                onPress: () =>
                  void runQuick({ kind: "BREAST", side: "pump_r" }),
              },
              {
                side: "pump_both",
                label: babyTimedCareChipLabel({
                  running: pumpTimer?.side === "pump_both",
                  idleLabel: t("home.pumpBoth"),
                  endTitle: t("home.pumpBoth"),
                  tapToStop: t("home.tapToStop"),
                }),
                running: pumpTimer?.side === "pump_both",
                elapsedText:
                  pumpTimer?.side === "pump_both" ? pumpElapsed : undefined,
                tapToStart: t("home.tapToStart"),
                tapToStop: t("home.tapToStop"),
                subtitle:
                  pumpTimer?.side === "pump_both" && pumpStale
                    ? fill(t("home.timerStaleNote"), {
                        time: new Date(
                          pumpTimer!.startedAt,
                        ).toLocaleTimeString(),
                      })
                    : undefined,
                disabled: savingOwner === "pump_both",
                doneText:
                  breastDoneSide === "pump_both" ? t("home.done") : null,
                onPress: () =>
                  void runQuick({ kind: "BREAST", side: "pump_both" }),
              },
            ]}
          />
          <div data-section-footer="pump">
            {renderSectionFooter({
              owners: BABY_HOME_PUMP_PENDING_ORDER,
              ageTip: pumpFooterTip ? (
                <p className="text-sm text-muted">{pumpFooterTip}</p>
              ) : null,
            })}
          </div>
        </section>
        <section
          aria-labelledby="baby-home-heading-pump-amount"
          data-section="pump-amount"
          className="row-span-3 grid min-w-0 grid-rows-subgrid gap-y-2"
        >
          <div className="flex items-start gap-2">
            <IconBabyPump className="mt-0.5 size-5 shrink-0" aria-hidden />
            <BabyHomeSectionHeading
              testId="baby-home-header-pump-amount"
              headingId="baby-home-heading-pump-amount"
              lead={t("home.pumpAmount")}
              bodyMarked={null}
            />
          </div>
          <BabyMlChipSection
            data-section="pump-amount-chips"
            mls={pumpChipMls}
            selectedMl={selectedPumpMl}
            doneFlash={pumpAmountDoneMl != null}
            doneText={t("home.done")}
            disabled={savingOwner === "pump_amount"}
            customSelected={pumpCustomSelected}
            showEditCustom={pumpCustomSelected}
            onEditCustom={() => {
              if (savingOwner != null) return;
              setPumpCustomOpen(true);
            }}
            className="h-full"
            groupLabel={t("home.pumpAmount")}
            onSelectMl={(ml) => {
              if (!(pumpAmountFromCustom && pumpAmountOverride === ml)) {
                setPumpAmountFromCustom(false);
                setPumpCustomIso(null);
              }
              setPumpAmountOverride(ml);
              void runQuick({ kind: "PUMP_AMOUNT", amountMl: ml });
            }}
            onCustom={() => {
              if (savingOwner != null) return;
              if (
                babyHomeCustomMlTapAction({
                  fromCustom: pumpAmountFromCustom,
                  override: pumpAmountOverride,
                }) === "save"
              ) {
                void runQuick({
                  kind: "PUMP_AMOUNT",
                  amountMl: pumpAmountOverride!,
                });
                return;
              }
              setPumpCustomOpen(true);
            }}
            t={t}
          />
          <div data-section-footer="pump-amount" />
        </section>
      </div>

      {/* Last care status — one sentence per kind */}
      <div className="space-y-3" data-testid="baby-home-status">
        <div className="flex items-start gap-2 space-y-0 border-b border-border/70 pb-3">
          {statusKindIcon("feed")}
          <div className="min-w-0 flex-1">{statusLine("feed")}</div>
        </div>
        <div className="flex items-start gap-2 space-y-0 border-b border-border/70 pb-3">
          {statusKindIcon("sleep")}
          <div className="min-w-0 flex-1">{statusLine("sleep")}</div>
        </div>
        <div className="flex items-start gap-2 space-y-0 border-b border-border/70 pb-3">
          {statusKindIcon("diaper")}
          <div className="min-w-0 flex-1">{statusLine("diaper")}</div>
        </div>
        <div className="flex items-start gap-2 space-y-0">
          {statusKindIcon("pump")}
          <div className="min-w-0 flex-1">{statusLine("pump")}</div>
        </div>
      </div>

      {saveAnnouncement ? (
        <p className="text-sm text-muted" role="status">
          {saveAnnouncement}
        </p>
      ) : null}

      <div
        data-testid="baby-birth-date-modal-state"
        data-birth-date-modal={showBirthModal ? "open" : "closed"}
        hidden
      />

      <Modal
        open={showBirthModal}
        onClose={dismissBirthModal}
        title={t("home.birthDateModalTitle")}
        closeDisabled={birthSaving}
      >
        <form
          data-testid="baby-birth-date-modal"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void saveBirthDateFromModal();
          }}
        >
          <Field
            label={t("settings.birthDate")}
            hint={birthError ? undefined : t("settings.birthDateHint")}
            error={birthError ?? undefined}
          >
            <Input
              type="date"
              max={new Date(clock).toISOString().slice(0, 10)}
              value={birthDraft}
              onChange={(e) => {
                setBirthDraft(e.target.value);
                setBirthError(null);
              }}
            />
          </Field>
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              disabled={birthSaving}
              onClick={dismissBirthModal}
            >
              {t("home.birthDateNotNow")}
            </Button>
            <Button type="submit" size="lg" disabled={birthSaving}>
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Guidelines at page bottom — quiet one-block secondary copy */}
      <BabyCareGuidelines model={guidelineModel} />

      <BabyCustomMlModal
        open={customOpen}
        initialMl={formulaMl}
        initialIso={formulaCustomIso}
        onClose={() => setCustomOpen(false)}
        onConfirm={({ ml, iso }) => {
          // Confirm sets ml + time — tap Custom again to save (no auto-save).
          setFormulaOverride(ml);
          setFormulaCustomIso(iso);
          setFormulaFromCustom(true);
          setCustomOpen(false);
        }}
        t={t}
      />

      <BabyCustomMlModal
        open={pumpCustomOpen}
        initialMl={pumpCustomMl}
        initialIso={pumpCustomIso}
        onClose={() => setPumpCustomOpen(false)}
        onConfirm={({ ml, iso }) => {
          setPumpAmountOverride(ml);
          setPumpCustomIso(iso);
          setPumpAmountFromCustom(true);
          setPumpCustomOpen(false);
        }}
        t={t}
      />

      <BabyCustomTimeModal
        open={customTimeModal != null}
        fields={
          customTimeModal?.target === "nap"
            ? "time+duration"
            : customTimeModal?.target === "diaper"
              ? "time+diaperKind"
              : "time"
        }
        initialIso={
          customTimeModal?.target === "nap"
            ? napCustomTimeIso
            : customTimeModal?.target === "diaper"
              ? diaperCustomTimeIso
              : null
        }
        initialDurationMinutes={
          customTimeModal?.target === "nap" ? napCustomDurationMinutes : null
        }
        onClose={() => setCustomTimeModal(null)}
        onConfirm={({ iso, durationMinutes, diaperKind }) => {
          if (customTimeModal?.target === "nap") {
            setNapCustomTimeIso(iso);
            setNapCustomDurationMinutes(
              durationMinutes != null && durationMinutes > 0
                ? durationMinutes
                : null,
            );
            setCustomTimeModal(null);
            return;
          }
          if (customTimeModal?.target === "diaper" && diaperKind) {
            diaperCustomTimeIsoRef.current = iso;
            setDiaperCustomTimeIso(iso);
            setCustomTimeModal(null);
            onDiaperPlan(planBabyDiaperKindTap(diaperKind));
            return;
          }
          setCustomTimeModal(null);
        }}
        onClear={() => {
          if (customTimeModal?.target === "nap") {
            setNapCustomTimeIso(clearBabyHomeCustomClockPending());
            setNapCustomDurationMinutes(null);
          } else if (customTimeModal?.target === "diaper") {
            diaperCustomTimeIsoRef.current = null;
            setDiaperCustomTimeIso(clearBabyHomeCustomClockPending());
          }
        }}
        t={t}
      />

      {diaperSheet ? (
        <BabyDiaperDetailSheet
          key={diaperSheet.diaperKind}
          open
          diaperKind={diaperSheet.diaperKind}
          saving={saving}
          onClose={() => setDiaperSheet(null)}
          onSave={(mutation) => {
            void runQuick({
              kind: "DIAPER",
              diaperKind: mutation.diaperKind,
              diaperColor: mutation.diaperColor,
              diaperTexture: mutation.diaperTexture,
              diaperAmount: mutation.diaperAmount,
            });
          }}
          t={t}
        />
      ) : null}
    </div>
  );
}

export function BabyHome() {
  const { t, locale } = useBabyLocale();
  const queryClient = useQueryClient();
  const [day, setDay] = useState(() => babyLocalDayWindow(new Date()));

  // Single day source for babyHomeQuickStatus — midnight timer + wake.
  useEffect(() => {
    return attachBabyLocalDayRoll(
      (now) => {
        setDay((prev) => nextBabyLocalDayIfChanged(prev.dayKey, now) ?? prev);
      },
      {
        now: () => new Date(),
        setTimeout: (fn, ms) => setTimeout(fn, ms),
        clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
        addVisibilityListener: (fn) =>
          document.addEventListener("visibilitychange", fn),
        removeVisibilityListener: (fn) =>
          document.removeEventListener("visibilitychange", fn),
        addFocusListener: (fn) => window.addEventListener("focus", fn),
        removeFocusListener: (fn) => window.removeEventListener("focus", fn),
      },
    );
  }, []);

  const active = useQuery(
    babyHomeQuickStatusQueryOptions(new Date(`${day.dayKey}T12:00:00`)),
  );

  return (
    <BabyHomeContent
      status={active.data?.babyHomeQuickStatus ?? null}
      statusLoading={active.isLoading}
      statusError={active.isError}
      onRetryStatus={() => void active.refetch()}
      babyId={BABY_CARE_TIMER_CLIENT_ID}
      dayKey={day.dayKey}
      t={(key) => t(key as never)}
      locale={locale}
      onInvalidateCare={() => invalidateBabyQueries(queryClient, "care")}
      onInvalidateProfile={() => invalidateBabyQueries(queryClient, "profile")}
    />
  );
}
