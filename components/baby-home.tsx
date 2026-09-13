"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BabyBottleMlChips } from "@/components/baby-bottle-ml-chips";
import { BabyCustomMlModal } from "@/components/baby-custom-ml-modal";
import { BabyDiaperDetailSheet } from "@/components/baby-diaper-detail-sheet";
import { BabyDiaperKindControl } from "@/components/baby-diaper-kind-control";
import { useBabyLocale } from "@/components/baby-locale-provider";
import { BabyQuickSimpleCard } from "@/components/baby-quick-value-card";
import {
  IconBabyBreast,
  IconBabySleep,
} from "@/components/icons/icon-baby-nav";
import { IconSwap } from "@/components/ui/icon-swap";
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
  BABY_BREAST_TIMER_STORAGE_KEY,
  babyBreastElapsedSec,
  parseBabyBreastTimer,
  serializeBabyBreastTimer,
  type BabyBreastTimer,
} from "@/lib/baby-breast-timer-store";
import {
  isBabyBirthDatePromptVisitDismissed,
  markBabyBirthDatePromptVisitDismissed,
  shouldShowBabyBirthDatePrompt,
} from "@/lib/baby-birth-date-prompt";
import {
  formatBabyDurationCompact,
  formatBabyDurationLocale,
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
  classifyBabyQuickCareError,
  softInvalidateAfterQuickCare,
} from "@/lib/baby-quick-care-outcome";
import {
  babyQuickCareStepMessageKey,
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
  babyQuickPendingView,
  clearBabyQuickPending,
  readBabyQuickPending,
  writeBabyQuickPending,
  type BabyQuickPending,
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
  return formatBabyDurationCompact(babyBreastElapsedSec(startedAt, now));
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
  /** Injected bottle done-flash ml for markup tests (Task 8 flash wiring). */
  bottleDoneMlSeed?: number | null;
  /** Injected breast Done flash side for markup tests. */
  breastDoneSideSeed?: "breast_l" | "breast_r" | null;
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
  bottleDoneMlSeed = null,
  breastDoneSideSeed = null,
  sleepDoneSeed = false,
}: BabyHomeContentProps) {
  const inFlightRef = useRef(false);
  const bottleDoneTimerRef = useRef(createBabyHomeDoneFlashTimer());
  const diaperDoneTimerRef = useRef(createBabyHomeDoneFlashTimer());
  const breastDoneTimerRef = useRef(createBabyHomeDoneFlashTimer());
  const sleepDoneTimerRef = useRef(createBabyHomeDoneFlashTimer());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(() => messageSeed);
  const [clock, setClock] = useState(() => nowMs ?? Date.now());
  const dayKey =
    dayKeyProp ??
    babyLocalDayWindow(new Date(nowMs ?? Date.now())).dayKey;
  const [breast, setBreast] = useState<BabyBreastTimer | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const parsed = parseBabyBreastTimer(
        localStorage.getItem(BABY_BREAST_TIMER_STORAGE_KEY),
        { babyId, now: Date.now() },
      );
      return parsed?.timer ?? null;
    } catch {
      return null;
    }
  });
  const [breastStale, setBreastStale] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const parsed = parseBabyBreastTimer(
        localStorage.getItem(BABY_BREAST_TIMER_STORAGE_KEY),
        { babyId, now: Date.now() },
      );
      return parsed?.stale ?? false;
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
    "breast_l" | "breast_r" | null
  >(() => breastDoneSideSeed);
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
  const sleepBand = babySleepGuideForAge(ageDays);
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

  const selectedBottleMl = resolveBabyHomeSelectedBottleMl({
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
  const pendingEnsureMl =
    formulaFromCustom && formulaOverride != null && formulaOverride > 0
      ? formulaOverride
      : bottleDoneMl;
  const bottleChipMls = ensureMlInBottleChips(
    bottleChipMlsBase,
    pendingEnsureMl,
  );
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
    const sleepTimer = sleepDoneTimerRef.current;
    return () => {
      bottleTimer.dispose();
      diaperTimer.dispose();
      breastTimer.dispose();
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
      const parsed = parseBabyBreastTimer(
        localStorage.getItem(BABY_BREAST_TIMER_STORAGE_KEY),
        { babyId, now: Date.now() },
      );
      setBreast(parsed?.timer ?? null);
      setBreastStale(parsed?.stale ?? false);
    } catch {
      setBreast(null);
      setBreastStale(false);
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

  function writeBreast(next: BabyBreastTimer | null) {
    setBreast(next);
    setBreastStale(false);
    try {
      if (next) {
        localStorage.setItem(
          BABY_BREAST_TIMER_STORAGE_KEY,
          serializeBabyBreastTimer(next),
        );
      } else {
        localStorage.removeItem(BABY_BREAST_TIMER_STORAGE_KEY);
      }
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
          breast,
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
      if (planned.localAfter.clearBreastTimer) writeBreast(null);
      if (planned.localAfter.startBreastSide) {
        writeBreast({
          babyId,
          side: planned.localAfter.startBreastSide,
          startedAt: clock,
        });
      }
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
          stopBreastSession: planned.localAfter.stopBreastSession,
          side: record.request.action.side,
        });
        if (side) {
          setBreastDoneSide(side);
          breastDoneTimerRef.current.arm(() => setBreastDoneSide(null));
        }
      }
      if (
        record.request.action.kind === "SLEEP" &&
        babyHomeSleepDoneFlash(true)
      ) {
        setSleepDone(true);
        sleepDoneTimerRef.current.arm(() => setSleepDone(false));
      }
      const stepNames = result.steps
        .map((s) =>
          t(
            babyQuickCareStepMessageKey(
              s.step as Parameters<typeof babyQuickCareStepMessageKey>[0],
            ),
          ),
        )
        .filter(Boolean);
      setMessage(
        stepNames.length > 0
          ? stepNames.join(" · ")
          : t("home.savedFeed"),
      );
      // Refetch failures must not undo confirmed success (Done + message).
      await softInvalidateAfterQuickCare(onInvalidateCare);
    } catch (error) {
      const cls = classifyBabyQuickCareError(error);
      if (cls === "definiteNoCommit") {
        clearPending();
      } else {
        const unknown: BabyQuickPending = { ...record, state: "unknown" };
        setPending(unknown);
        void writeBabyQuickPending(localStorage, unknown);
      }
      setMessage(t("home.chainFailed"));
    } finally {
      inFlightRef.current = false;
      setSaving(false);
    }
  }

  const breastElapsed = breast ? (
    <BabyBreastElapsedText startedAt={breast.startedAt} frozenNow={nowMs} />
  ) : null;

  function statusLine(
    kind: "feed" | "sleep" | "diaper",
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
        const elapsed = formatBabyDurationCompact(
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

  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "@container")}
      data-testid="baby-home"
      data-day-key={dayKey}
    >
      {/* Breast on its own row; bottle | nap | diaper share a wide-screen row. */}
      <section
        aria-labelledby="baby-home-heading-breast"
        data-section="breast"
        className="space-y-2"
      >
        <BabyHomeSectionHeading
          testId="baby-home-header-breast"
          headingId="baby-home-heading-breast"
          lead={t("home.header.breast")}
          bodyMarked={breastBody}
        />
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 8rem), 1fr))",
          }}
        >
          {(["breast_l", "breast_r"] as const).map((side) => {
            const running = breast?.side === side;
            const showDone = breastDoneSide === side;
            return (
              <BabyQuickSimpleCard
                key={side}
                labelId={`baby-breast-${side}`}
                label={t(side === "breast_l" ? "home.breastL" : "home.breastR")}
                valueText={
                  running
                    ? (breastElapsed ?? t("home.tapToSave"))
                    : t("home.tapToStart")
                }
                subtitle={
                  running && breastStale
                    ? fill(t("home.timerStaleNote"), {
                        time: new Date(breast!.startedAt).toLocaleTimeString(),
                      })
                    : undefined
                }
                disabled={saving}
                selected={running}
                doneText={showDone ? t("home.done") : null}
                onPress={() => void runQuick({ kind: "BREAST", side })}
                icon={
                  <IconSwap
                    active={running}
                    activeIcon={
                      <IconBabyBreast className="size-6 text-accent-foreground" />
                    }
                    inactiveIcon={<IconBabyBreast className="size-6" />}
                  />
                }
              />
            );
          })}
        </div>
      </section>

      {/* Wide: Bottle | Nap | Diaper one row; narrow: stack via auto-fit. */}
      <div
        data-layout="home-row-bottle-nap-diaper"
        className="grid gap-3"
        style={{
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
        }}
      >
        <section
          aria-labelledby="baby-home-heading-bottle"
          data-section="bottle"
          className="flex min-w-0 flex-col space-y-2"
        >
          <BabyHomeSectionHeading
            testId="baby-home-header-bottle"
            headingId="baby-home-heading-bottle"
            lead={t("home.header.bottle")}
            bodyMarked={bottleBody}
          />
          <div className="flex min-h-20 flex-1 flex-col">
            <BabyBottleMlChips
              mls={bottleChipMls}
              selectedMl={selectedBottleMl}
              doneFlash={bottleDoneMl != null}
              doneText={t("home.logged")}
              disabled={saving}
              customSelected={false}
              onSelectMl={(ml) => {
                setFormulaFromCustom(false);
                setFormulaOverride(ml);
                void runQuick({ kind: "FORMULA", amountMl: ml });
              }}
              onCustom={() => {
                if (saving) return;
                setCustomOpen(true);
              }}
              t={t}
            />
          </div>
        </section>

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
          <div data-layout="home-nap" className="flex min-h-20 flex-1 flex-col">
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
              <BabyQuickSimpleCard
                labelId="baby-quick-sleep-label"
                label={napOpen ? t("home.sleepEnd") : t("home.sleepStart")}
                valueText={
                  napOpen
                    ? formatBabyDurationCompact(
                        Math.max(
                          0,
                          Math.floor(
                            (clock -
                              Date.parse(
                                (openSleepOverride ?? status?.openSleep)!
                                  .occurredAt,
                              )) /
                              1000,
                          ),
                        ),
                      )
                    : t("home.tapToStart")
                }
                subtitle={napOpen ? undefined : nextSleepLabel ?? undefined}
                disabled={saving}
                doneText={sleepDone ? t("home.done") : null}
                onPress={() => void runQuick({ kind: "SLEEP" })}
                icon={<IconBabySleep className="size-6" />}
              />
            )}
          </div>
        </section>

        <section
          aria-labelledby="baby-home-heading-diaper"
          data-section="diaper"
          className="flex min-w-0 flex-col space-y-2"
        >
          <BabyHomeSectionHeading
            testId="baby-home-header-diaper"
            headingId="baby-home-heading-diaper"
            lead={t("home.header.diaper")}
            bodyMarked={diaperBody}
          />
          <div className="flex min-h-20 flex-1 flex-col">
            <BabyDiaperKindControl
              disabled={saving}
              doneKind={diaperDoneKind}
              doneText={t("home.done")}
              onPlan={onDiaperPlan}
              t={t}
            />
          </div>
        </section>
      </div>

      {birthDate ? (
        <p className="text-xs text-muted">{t("home.guideCaveat")}</p>
      ) : null}

      {/* Last care status — one sentence per kind */}
      <div className="space-y-3" data-testid="baby-home-status">
        <div className="space-y-1 border-b border-border/70 pb-3">
          {statusLine("feed")}
        </div>
        <div className="space-y-1 border-b border-border/70 pb-3">
          {statusLine("sleep")}
        </div>
        <div className="space-y-1">{statusLine("diaper")}</div>
      </div>

      {/* Pending bar — below care controls; skeleton draws nothing for it */}
      {pendingView.kind === "retryable" ? (
        <div className="rounded-[var(--radius-md)] border border-border p-3">
          <p className="text-sm">{t("home.pendingTitle")}</p>
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              className="min-h-11 rounded-[var(--radius-sm)] px-3 text-sm text-accent"
              onClick={() => void runQuick(pendingView.pending.request.action, pendingView.pending)}
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
      ) : null}
      {pendingView.kind === "tooOld" ? (
        <div className="rounded-[var(--radius-md)] border border-border p-3">
          <p className="text-sm">{t("home.pendingTooOld")}</p>
          <div className="mt-2 flex gap-3">
            <Link
              href="/baby/timeline"
              className="min-h-11 text-sm text-accent"
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
      ) : null}

      {message ? (
        <p className="text-sm text-muted" role="status">
          {saving ? t("home.saving") : message}
        </p>
      ) : saving ? (
        <p className="text-sm text-muted" role="status">
          {t("home.saving")}
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
      babyId="home"
      dayKey={day.dayKey}
      t={(key) => t(key as never)}
      locale={locale}
      onInvalidateCare={() => invalidateBabyQueries(queryClient, "care")}
    />
  );
}
