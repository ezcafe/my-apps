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
import { BabyCustomMlModal } from "@/components/baby-custom-ml-modal";
import { BabyDiaperDetailSheet } from "@/components/baby-diaper-detail-sheet";
import { BabyDiaperKindControl } from "@/components/baby-diaper-kind-control";
import { useBabyLocale } from "@/components/baby-locale-provider";
import { BabyMlChipSection } from "@/components/baby-ml-chip-section";
import { BabyPumpSidePair } from "@/components/baby-pump-side-pair";
import { BabyTimedCareChip } from "@/components/baby-timed-care-chip";
import {
  IconBabyBottle,
  IconBabyDiaper,
  IconBabySleep,
} from "@/components/icons/icon-baby-nav";
import {
  BABY_BOTTLE_CHIPS_NO_BIRTH_SNAPS,
  babyAgeInDays,
  babyFeedGuideForAge,
  babyFormulaSnapList,
  babySleepGuideForAge,
  babySuggestedBottleMl,
  buildBabyBottleChipMls,
} from "@/lib/baby-age-guide";
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
  markBabyBirthDatePromptVisitDismissed,
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
  formatBabyNextDueLabel,
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
import type { BabyDiaperQuickPlan } from "@/lib/baby-diaper-quick-plan";
import {
  babyHomeCustomInitialMl,
  ensureMlInBottleChips,
  resolveBabyHomeSelectedBottleMl,
} from "@/lib/baby-home-bottle-selection";
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
    if (typeof window === "undefined") return emptyBabyCareTimerSlots(babyId);
    try {
      return (
        readBabyCareTimerSlots(localStorage, {
          babyId,
          now: Date.now(),
        })?.slots ?? emptyBabyCareTimerSlots(babyId)
      );
    } catch {
      return emptyBabyCareTimerSlots(babyId);
    }
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
  const [breastStale, setBreastStale] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return (
        readBabyCareTimerSlots(localStorage, {
          babyId,
          now: Date.now(),
        })?.breastStale ?? false
      );
    } catch {
      return false;
    }
  });
  const [pumpStale, setPumpStale] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return (
        readBabyCareTimerSlots(localStorage, {
          babyId,
          now: Date.now(),
        })?.pumpStale ?? false
      );
    } catch {
      return false;
    }
  });
  const [feedSession, setFeedSession] = useState<BabyFeedSessionHandle | null>(
    () => {
      if (typeof window === "undefined") return null;
      return readBabyHomeFeedSession(localStorage, {
        babyId,
        now: Date.now(),
      });
    },
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
  const [sleepDone, setSleepDone] = useState(() => sleepDoneSeed);
  const [openSleepOverride, setOpenSleepOverride] = useState<
    BabyHomeQuickStatusData["babyHomeQuickStatus"]["openSleep"] | undefined
  >(undefined);
  const [pending, setPending] = useState<BabyQuickPending | null>(() => {
    if (pendingSeed) return pendingSeed;
    if (typeof window === "undefined") return null;
    try {
      return readBabyQuickPending(localStorage, { babyId });
    } catch {
      return null;
    }
  });
  const [visitDismissed, setVisitDismissed] = useState(false);

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
      ? babyFormulaSnapList(band)
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

  const nextSleepLabel = formatBabyNextDueLabel(
    babyNextSleepDue({
      now: clock,
      ageDays,
      lastSleepEndedAt: status?.lastSleep?.endedAt
        ? Date.parse(status.lastSleep.endedAt)
        : null,
      napOpen,
    }),
    (key, vars) => fill(t(key), vars),
    locale,
  );

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
      setPending(readBabyQuickPending(localStorage, { babyId }));
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
    try {
      setVisitDismissed(isBabyBirthDatePromptVisitDismissed(sessionStorage));
    } catch {
      setVisitDismissed(false);
    }
  }, []);

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
          className="space-y-2"
        >
          <p className="text-sm text-destructive">{t("home.pendingTooOld")}</p>
          <div className="flex gap-3">
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
        </div>
      );
    }
    return (
      <div
        data-testid="baby-home-pending-recovery"
        data-pending-owner={owner}
        className="space-y-2"
      >
        <p className="text-sm text-destructive">{t("home.pendingTitle")}</p>
        <div className="flex gap-3">
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
      </div>
    );
  }

  const showBirthPrompt = shouldShowBabyBirthDatePrompt({
    birthDate,
    visitDismissed,
  });

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
        setFormulaOverride(null);
        setFormulaFromCustom(false);
        if (doneMl != null) {
          setBottleDoneMl(doneMl);
          bottleDoneTimerRef.current.arm(() => setBottleDoneMl(null));
        }
      }
      if (record.request.action.kind === "PUMP_AMOUNT") {
        const doneMl = babyHomeBottleDoneMl(record.request.action.amountMl);
        setPumpAmountOverride(null);
        setPumpAmountFromCustom(false);
        if (doneMl != null) {
          setPumpAmountDoneMl(doneMl);
          pumpDoneTimerRef.current.arm(() => setPumpAmountDoneMl(null));
        }
      }
      if (record.request.action.kind === "DIAPER") {
        const dk = babyHomeDiaperDoneKind(
          record.request.action.diaperKind,
        );
        setDiaperSheet(null);
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
        const endedSleepSession = result.steps.some(
          (s) => s.step === "endNap",
        );
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
  if (
    birthDate &&
    band.feedsMax !== Number.POSITIVE_INFINITY &&
    Number.isFinite(band.feedsMax)
  ) {
    bottleBody = [
      fillBabyHomeTemplate(t("home.header.bottleMl"), {
        ml: String(formulaDefault),
      }),
      fillBabyHomeTemplate(t("home.header.bottleProgress"), {
        n: String(status?.feedsToday ?? 0),
        max: String(band.feedsMax),
      }),
    ].join(" ");
  } else {
    bottleBody = t("home.header.bottleEmpty");
  }

  const napBody = sleepBand
    ? t(sleepBand.blendKey)
    : t("home.header.napEmpty");

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

  const guidelineSections = [
    {
      id: "feed" as const,
      title: t("home.guide.feedTitle"),
      body: [
        t("home.guide.feed.1"),
        t("home.guide.feed.2"),
        t("home.guide.feed.3"),
      ],
    },
    {
      id: "sleep" as const,
      title: t("home.guide.sleepTitle"),
      body: [
        t("home.guide.sleep.1"),
        t("home.guide.sleep.2"),
        t("home.guide.sleep.3"),
      ],
    },
    {
      id: "diaper" as const,
      title: t("home.guide.diaperTitle"),
      body: [
        t("home.guide.diaper.1"),
        t("home.guide.diaper.2"),
        t("home.guide.diaper.3"),
      ],
    },
    {
      id: "pump" as const,
      title: t("home.guide.pumpTitle"),
      body: [
        t("home.guide.pump.1"),
        t("home.guide.pump.2"),
        t("home.guide.pump.3"),
        t("home.guide.pump.4"),
        t("home.guide.pump.5"),
        t("home.guide.pump.6"),
      ],
    },
  ];

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
      {/* Row 1: Breast L·R + Bottle */}
      <div
        data-layout="home-row-breast-bottle"
        data-section="row-feed"
        className="grid gap-3"
        style={{
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
        }}
      >
        <section
          aria-labelledby="baby-home-heading-breast"
          data-section="breast"
          className="flex min-w-0 flex-col space-y-2"
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
                label: t("home.breastL"),
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
                helperText: t("home.helper.breast"),
                recovery: renderPendingRecovery("breast_l"),
                disabled: savingOwner === "breast_l",
                doneText:
                  breastDoneSide === "breast_l" ? t("home.done") : null,
                onPress: () =>
                  void runQuick({ kind: "BREAST", side: "breast_l" }),
              },
              {
                side: "breast_r",
                label: t("home.breastR"),
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
                helperText: t("home.helper.breast"),
                recovery: renderPendingRecovery("breast_r"),
                disabled: savingOwner === "breast_r",
                doneText:
                  breastDoneSide === "breast_r" ? t("home.done") : null,
                onPress: () =>
                  void runQuick({ kind: "BREAST", side: "breast_r" }),
              },
            ]}
          />
        </section>
        <section
          aria-labelledby="baby-home-heading-bottle"
          data-section="bottle"
          className="flex min-w-0 flex-col space-y-2"
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
            doneText={t("home.logged")}
            disabled={savingOwner === "bottle"}
            customSelected={false}
            onSelectMl={(ml) => {
              setFormulaFromCustom(false);
              setFormulaOverride(ml);
              void runQuick({ kind: "FORMULA", amountMl: ml });
            }}
            onCustom={() => {
              if (savingOwner != null) return;
              setCustomOpen(true);
            }}
            t={t}
            helperText={t("home.helper.bottle")}
            recovery={renderPendingRecovery("bottle")}
          />
        </section>
      </div>

      {/* Row 2: Nap + Diaper */}
      <div
        data-layout="home-row-nap-diaper"
        className="grid gap-3"
        style={{
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
        }}
      >
        <section
          aria-labelledby="baby-home-heading-nap"
          data-section="nap"
          className="flex min-w-0 flex-col space-y-2"
        >
          <BabyHomeSectionHeading
            testId="baby-home-header-nap"
            headingId="baby-home-heading-nap"
            lead={t("home.header.nap")}
            bodyMarked={napBody}
          />
          {sleepFailClosed ? (
            <div className="h-full rounded-[var(--radius-md)] border border-border p-3">
              <p className="text-sm text-muted">{t("home.napCheckFailed")}</p>
              <button
                type="button"
                className="mt-2 min-h-11 text-sm text-accent"
                onClick={onRetryStatus}
              >
                {t("sleep.retryCheck")}
              </button>
            </div>
          ) : (
            <BabyTimedCareChip
              data-testid="baby-care-chip-nap"
              labelId="baby-quick-sleep-label"
              label={napOpen ? t("home.sleepEnd") : t("home.sleepStart")}
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
              subtitle={napOpen ? "\u00a0" : nextSleepLabel ?? "\u00a0"}
              helperText={t("home.helper.nap")}
              recovery={renderPendingRecovery("nap")}
              disabled={savingOwner === "nap"}
              doneText={sleepDone ? t("home.done") : null}
              onPress={() => void runQuick({ kind: "SLEEP" })}
              icon={<IconBabySleep className="size-6" />}
            />
          )}
        </section>
        <section
          aria-labelledby="baby-home-heading-diaper"
          data-section="diaper"
          className="flex min-w-0 flex-col space-y-2"
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
          <BabyDiaperKindControl
            disabled={savingOwner === "diaper"}
            doneKind={diaperDoneKind}
            doneText={t("home.done")}
            onPlan={onDiaperPlan}
            t={t}
          />
          <p className="text-xs text-muted">{t("home.helper.diaper")}</p>
          {renderPendingRecovery("diaper")}
        </section>
      </div>

      {/* Row 3: Pump L·R + Pump amount (section header like Breast) */}
      <section
        aria-labelledby="baby-home-heading-pump"
        data-section="pump"
        data-layout="home-row-pump"
        className="flex min-w-0 flex-col space-y-2"
      >
        <BabyHomeSectionHeading
          testId="baby-home-header-pump"
          headingId="baby-home-heading-pump"
          lead={t("home.header.pump")}
          bodyMarked={fillBabyHomeTemplate(t("home.header.pumpEmpty"), {
            left: t("home.pumpL"),
            right: t("home.pumpR"),
          })}
        />
        <div
          className="grid items-stretch gap-3"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 8rem), 1fr))",
          }}
        >
          <BabyPumpSidePair
            asContents
            sides={[
              {
                side: "pump_l",
                label: t("home.pumpL"),
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
                helperText: t("home.helper.pump"),
                recovery: renderPendingRecovery("pump_l"),
                disabled: savingOwner === "pump_l",
                doneText:
                  breastDoneSide === "pump_l" ? t("home.done") : null,
                onPress: () =>
                  void runQuick({ kind: "BREAST", side: "pump_l" }),
              },
              {
                side: "pump_r",
                label: t("home.pumpR"),
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
                helperText: t("home.helper.pump"),
                recovery: renderPendingRecovery("pump_r"),
                disabled: savingOwner === "pump_r",
                doneText:
                  breastDoneSide === "pump_r" ? t("home.done") : null,
                onPress: () =>
                  void runQuick({ kind: "BREAST", side: "pump_r" }),
              },
            ]}
          />
          <BabyMlChipSection
            data-section="pump-amount"
            mls={pumpChipMls}
            selectedMl={selectedPumpMl}
            doneFlash={pumpAmountDoneMl != null}
            doneText={t("home.logged")}
            disabled={savingOwner === "pump_amount"}
            customSelected={false}
            className="h-full"
            groupLabel={t("home.pumpAmount")}
            onSelectMl={(ml) => {
              setPumpAmountFromCustom(false);
              setPumpAmountOverride(ml);
              void runQuick({ kind: "PUMP_AMOUNT", amountMl: ml });
            }}
            onCustom={() => {
              if (savingOwner != null) return;
              setPumpCustomOpen(true);
            }}
            t={t}
            helperText={t("home.helper.pumpAmount")}
            recovery={renderPendingRecovery("pump_amount")}
          />
        </div>
      </section>

      {/* Last care status — one sentence per kind */}
      <div className="space-y-3" data-testid="baby-home-status">
        <div className="space-y-1 border-b border-border/70 pb-3">
          {statusLine("feed")}
        </div>
        <div className="space-y-1 border-b border-border/70 pb-3">
          {statusLine("sleep")}
        </div>
        <div className="space-y-1 border-b border-border/70 pb-3">
          {statusLine("diaper")}
        </div>
        <div className="space-y-1">{statusLine("pump")}</div>
      </div>

      {saveAnnouncement ? (
        <p className="text-sm text-muted" role="status">
          {saveAnnouncement}
        </p>
      ) : null}

      {/* Birth prompt last — skeleton draws nothing; shifts nothing above */}
      {showBirthPrompt && !statusError ? (
        <div className="text-sm text-muted" data-testid="baby-birth-date-prompt">
          <p>{t("home.birthDatePrompt")}</p>
          <div className="mt-2 flex gap-3">
            <Link
              href="/baby/settings#baby-profile"
              className="min-h-11 text-sm text-accent"
            >
              {t("home.birthDateAdd")}
            </Link>
            <button
              type="button"
              className="min-h-11 rounded-[var(--radius-sm)] px-3 text-sm"
              onClick={() => {
                setVisitDismissed(true);
                if (typeof window !== "undefined") {
                  markBabyBirthDatePromptVisitDismissed(sessionStorage);
                }
              }}
            >
              {t("home.birthDateNotNow")}
            </button>
          </div>
        </div>
      ) : null}

      {/* Guidelines at page bottom — exclusive accordion, collapsed by default */}
      <BabyCareGuidelines sections={guidelineSections} />

      <BabyCustomMlModal
        open={customOpen}
        initialMl={formulaMl}
        onClose={() => setCustomOpen(false)}
        onConfirm={(ml) => {
          // Confirm sets ml only — tap the ml chip to save (no Custom auto-save).
          setFormulaOverride(ml);
          setFormulaFromCustom(true);
          setCustomOpen(false);
        }}
        t={t}
      />

      <BabyCustomMlModal
        open={pumpCustomOpen}
        initialMl={pumpCustomMl}
        onClose={() => setPumpCustomOpen(false)}
        onConfirm={(ml) => {
          setPumpAmountOverride(ml);
          setPumpAmountFromCustom(true);
          setPumpCustomOpen(false);
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
    />
  );
}
