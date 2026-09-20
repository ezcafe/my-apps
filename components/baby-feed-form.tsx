"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { BabyBreastSidePair } from "@/components/baby-breast-side-pair";
import { BabyCustomMlModal } from "@/components/baby-custom-ml-modal";
import { BabyMlChipSection } from "@/components/baby-ml-chip-section";
import { useBabyLocale } from "@/components/baby-locale-provider";
import {
  babyTimedCareChipLabel,
} from "@/components/baby-timed-care-chip";
import { useNotify } from "@/components/notification-provider";
import { babyGraphQLRequest } from "@/lib/baby-gql-client";
import {
  BABY_CARE_AFTER_SAVE,
  runBabyCareSaveThenNavigate,
} from "@/lib/baby-care-save-navigate";
import {
  babyBreastElapsedSec,
  babyCareTimerStopFeedInput,
  BABY_CARE_TIMER_CLIENT_ID,
  emptyBabyCareTimerSlots,
  readBabyCareTimerSlots,
  withCareTimerSide,
  writeBabyCareTimerSlots,
  type BabyBreastCareSide,
  type BabyCareTimerSlots,
} from "@/lib/baby-breast-timer-store";
import { formatBabyDurationTimer } from "@/lib/baby-format-duration";
import {
  BABY_CARE_DONE_BEFORE_NAV_MS,
  babyHomeBottleDoneMl,
  babyHomeBreastDoneSide,
  createBabyHomeDoneFlashTimer,
} from "@/lib/baby-home-done-flash";
import {
  BABY_BOTTLE_CHIPS_NO_BIRTH_SNAPS,
  babySuggestedBottleMl,
  buildBabyBottleChipMls,
} from "@/lib/baby-age-guide";
import {
  babyHomeCustomInitialMl,
  babyHomeCustomMlTapAction,
  babyHomeKeepFromCustomAfterAmountSuccess,
  resolveBabyHomeCustomSelected,
  resolveBabyHomeSelectedBottleMl,
} from "@/lib/baby-home-bottle-selection";
import { invalidateBabyQueries } from "@/lib/baby-query-options";
import { cn } from "@/lib/cn";
import { SHELL_DASHBOARD_STACK, SHELL_FULL_SPAN } from "@/lib/shell-layout";

const MUTATION = /* GraphQL */ `
  mutation CreateBabyFeed($input: CreateBabyFeedInput!) {
    createBabyFeed(input: $input) {
      id
    }
  }
`;

export function BabyFeedForm() {
  const { t } = useBabyLocale();
  const notify = useNotify();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const babyId = BABY_CARE_TIMER_CLIENT_ID;
  const [slots, setSlots] = useState<BabyCareTimerSlots | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [doneSide, setDoneSide] = useState<BabyBreastCareSide | null>(null);
  const [doneMl, setDoneMl] = useState<number | null>(null);
  const [formulaOverride, setFormulaOverride] = useState<number | null>(null);
  const [formulaFromCustom, setFormulaFromCustom] = useState(false);
  const [formulaCustomIso, setFormulaCustomIso] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const doneTimerRef = useRef(createBabyHomeDoneFlashTimer());

  const formulaDefault = babySuggestedBottleMl({ ageDays: null });
  const bottleChipMls = useMemo(
    () =>
      buildBabyBottleChipMls({
        recentBottleMl: [],
        snaps: [...BABY_BOTTLE_CHIPS_NO_BIRTH_SNAPS],
        limit: 3,
      }),
    [],
  );
  const selectedBottleMl = resolveBabyHomeSelectedBottleMl({
    bottleDoneMl: doneMl,
    formulaFromCustom,
    formulaOverride,
  });
  const bottleCustomSelected = resolveBabyHomeCustomSelected({
    fromCustom: formulaFromCustom,
    override: formulaOverride,
    doneMl,
  });

  useEffect(() => {
    try {
      const parsed = readBabyCareTimerSlots(localStorage, {
        babyId,
        now: Date.now(),
      });
      setSlots(parsed?.slots ?? emptyBabyCareTimerSlots(babyId));
    } catch {
      setSlots(emptyBabyCareTimerSlots(babyId));
    }
  }, [babyId]);

  useEffect(() => {
    if (!slots?.breast) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [slots?.breast]);

  useEffect(() => {
    const timerHost = doneTimerRef.current;
    return () => timerHost.dispose();
  }, []);

  function writeSlots(next: BabyCareTimerSlots) {
    setSlots(next);
    try {
      writeBabyCareTimerSlots(localStorage, next);
    } catch {
      /* ignore */
    }
  }

  function pressBreastSide(side: BabyBreastCareSide) {
    if (pending) return;
    const breast = slots?.breast;
    const running = breast?.side === side;
    if (!running) {
      writeSlots(
        withCareTimerSide(slots, {
          babyId,
          side,
          now: Date.now(),
        }),
      );
      return;
    }
    const startedAt = breast!.startedAt;
    const input = babyCareTimerStopFeedInput(side, startedAt, Date.now());
    startTransition(async () => {
      await runBabyCareSaveThenNavigate({
        mutate: async () => {
          await babyGraphQLRequest(MUTATION, { input });
        },
        onSuccess: async () => {
          writeSlots(
            withCareTimerSide(slots, {
              babyId,
              side: null,
              now: Date.now(),
              clearFamily: "breast",
            }),
          );
          const flash = babyHomeBreastDoneSide({
            stopBreastSession: true,
            side,
          });
          if (flash === "breast_l" || flash === "breast_r") {
            setDoneSide(flash);
            doneTimerRef.current.arm(() => setDoneSide(null));
          }
          await invalidateBabyQueries(queryClient, "care");
          notify.success(t("feed.saved"));
        },
        onError: (e) => {
          notify.error(e instanceof Error ? e.message : t("common.failed"));
        },
        router,
        afterSave: BABY_CARE_AFTER_SAVE.feedMethod,
        homeNavigateDelayMs: BABY_CARE_DONE_BEFORE_NAV_MS,
      });
    });
  }

  function logFormula(ml: number, fromCustom = formulaFromCustom) {
    if (pending) return;
    const occurredAt =
      fromCustom && formulaCustomIso ? formulaCustomIso : undefined;
    startTransition(async () => {
      await runBabyCareSaveThenNavigate({
        mutate: async () => {
          await babyGraphQLRequest(MUTATION, {
            input: {
              method: "formula",
              amountMl: ml,
              ...(occurredAt ? { occurredAt } : {}),
            },
          });
        },
        onSuccess: async () => {
          const flash = babyHomeBottleDoneMl(ml);
          const keepFromCustom = babyHomeKeepFromCustomAfterAmountSuccess({
            fromCustom,
            doneMl: flash,
          });
          setFormulaOverride(null);
          setFormulaFromCustom(keepFromCustom);
          if (!keepFromCustom) setFormulaCustomIso(null);
          if (flash != null) {
            setDoneMl(flash);
            doneTimerRef.current.arm(() => {
              setDoneMl(null);
              setFormulaFromCustom(false);
              setFormulaCustomIso(null);
            });
          }
          await invalidateBabyQueries(queryClient, "care");
          notify.success(t("feed.saved"));
        },
        onError: (e) => {
          notify.error(e instanceof Error ? e.message : t("common.failed"));
        },
        router,
        afterSave: BABY_CARE_AFTER_SAVE.feedMethod,
        homeNavigateDelayMs: BABY_CARE_DONE_BEFORE_NAV_MS,
      });
    });
  }

  const breast = slots?.breast ?? null;
  const breastElapsed = breast
    ? formatBabyDurationTimer(babyBreastElapsedSec(breast.startedAt, nowMs))
    : undefined;
  const formulaCustomMl = babyHomeCustomInitialMl({
    formulaOverride,
    birthDate: null,
    suggestedMl: formulaDefault,
    firstChipMl: bottleChipMls[0] ?? null,
  });

  return (
    <div
      className={cn(SHELL_DASHBOARD_STACK, SHELL_FULL_SPAN, "fx-fade-in")}
      data-testid="baby-feed-form"
    >
      <div
        className="grid items-stretch gap-3"
        style={{
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 8rem), 1fr))",
        }}
        data-testid="baby-feed-timer-chips"
        data-skeleton-marker="feed-timer-chips"
      >
        <BabyBreastSidePair
          asContents
          sides={[
            {
              side: "breast_l",
              "data-testid": "baby-feed-method-breast_l",
              label: babyTimedCareChipLabel({
                running: breast?.side === "breast_l",
                idleLabel: t("feed.breastL"),
                endTitle: t("feed.breastL"),
                tapToStop: t("home.tapToStop"),
              }),
              running: breast?.side === "breast_l",
              elapsedText:
                breast?.side === "breast_l" ? breastElapsed : undefined,
              tapToStart: t("home.tapToStart"),
              tapToStop: t("home.tapToStop"),
              doneText: doneSide === "breast_l" ? t("home.done") : null,
              disabled: pending,
              onPress: () => pressBreastSide("breast_l"),
            },
            {
              side: "breast_r",
              "data-testid": "baby-feed-method-breast_r",
              label: babyTimedCareChipLabel({
                running: breast?.side === "breast_r",
                idleLabel: t("feed.breastR"),
                endTitle: t("feed.breastR"),
                tapToStop: t("home.tapToStop"),
              }),
              running: breast?.side === "breast_r",
              elapsedText:
                breast?.side === "breast_r" ? breastElapsed : undefined,
              tapToStart: t("home.tapToStart"),
              tapToStop: t("home.tapToStop"),
              doneText: doneSide === "breast_r" ? t("home.done") : null,
              disabled: pending,
              onPress: () => pressBreastSide("breast_r"),
            },
          ]}
        />
        <BabyMlChipSection
          data-section="formula"
          mls={bottleChipMls}
          selectedMl={selectedBottleMl}
          doneFlash={doneMl != null}
          doneText={t("home.logged")}
          disabled={pending}
          customSelected={bottleCustomSelected}
          showEditCustom={bottleCustomSelected}
          onEditCustom={() => {
            if (pending) return;
            setCustomOpen(true);
          }}
          className="h-full"
          groupLabel={t("feed.formula")}
          onSelectMl={(ml) => {
            const wasCustomOrigin =
              formulaFromCustom && formulaOverride === ml;
            if (!wasCustomOrigin) {
              setFormulaFromCustom(false);
              setFormulaCustomIso(null);
            }
            setFormulaOverride(ml);
            logFormula(ml, wasCustomOrigin);
          }}
          onCustom={() => {
            if (pending) return;
            if (
              babyHomeCustomMlTapAction({
                fromCustom: formulaFromCustom,
                override: formulaOverride,
              }) === "save"
            ) {
              logFormula(formulaOverride!, true);
              return;
            }
            setCustomOpen(true);
          }}
          t={t}
        />
      </div>

      <BabyCustomMlModal
        open={customOpen}
        initialMl={formulaCustomMl}
        initialIso={formulaCustomIso}
        onClose={() => setCustomOpen(false)}
        onConfirm={({ ml, iso }) => {
          setFormulaOverride(ml);
          setFormulaCustomIso(iso);
          setFormulaFromCustom(true);
          setCustomOpen(false);
        }}
        t={t}
      />
    </div>
  );
}
