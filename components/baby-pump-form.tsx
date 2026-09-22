"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { BabyCustomMlModal } from "@/components/baby-custom-ml-modal";
import { BabyMlChipSection } from "@/components/baby-ml-chip-section";
import { BabyPumpSidePair } from "@/components/baby-pump-side-pair";
import { babyTimedCareChipLabel } from "@/components/baby-timed-care-chip";
import { useBabyLocale } from "@/components/baby-locale-provider";
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
  type BabyCareTimerSlots,
  type BabyPumpCareSide,
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

export function BabyPumpForm() {
  const { t } = useBabyLocale();
  const notify = useNotify();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const babyId = BABY_CARE_TIMER_CLIENT_ID;
  const [slots, setSlots] = useState<BabyCareTimerSlots | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [doneSide, setDoneSide] = useState<BabyPumpCareSide | null>(null);
  const [doneMl, setDoneMl] = useState<number | null>(null);
  const [pumpOverride, setPumpOverride] = useState<number | null>(null);
  const [pumpFromCustom, setPumpFromCustom] = useState(false);
  const [pumpCustomIso, setPumpCustomIso] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const doneTimerRef = useRef(createBabyHomeDoneFlashTimer());

  const pumpDefault = babySuggestedBottleMl({ ageDays: null });
  const pumpChipMls = useMemo(
    () =>
      buildBabyBottleChipMls({
        recentBottleMl: [],
        snaps: [...BABY_BOTTLE_CHIPS_NO_BIRTH_SNAPS],
        limit: 3,
      }),
    [],
  );
  const selectedPumpMl = resolveBabyHomeSelectedBottleMl({
    bottleDoneMl: doneMl,
    formulaFromCustom: pumpFromCustom,
    formulaOverride: pumpOverride,
  });
  const pumpCustomSelected = resolveBabyHomeCustomSelected({
    fromCustom: pumpFromCustom,
    override: pumpOverride,
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
    if (!slots?.pump) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [slots?.pump]);

  useEffect(() => {
    const host = doneTimerRef.current;
    return () => host.dispose();
  }, []);

  function writeSlots(next: BabyCareTimerSlots) {
    setSlots(next);
    try {
      writeBabyCareTimerSlots(localStorage, next);
    } catch {
      /* ignore */
    }
  }

  function pressPumpSide(side: BabyPumpCareSide) {
    if (pending) return;
    const pump = slots?.pump;
    const running = pump?.side === side;
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
    const startedAt = pump!.startedAt;
    const input = babyCareTimerStopFeedInput(side, startedAt, Date.now());
    startTransition(async () => {
      await runBabyCareSaveThenNavigate({
        mutate: async () => {
          if ("methods" in input) {
            await babyGraphQLRequest(MUTATION, {
              input: {
                method: "pump_l",
                durationSec: input.durationSec,
                legs: input.methods.map((method) => ({
                  method,
                  durationSec: input.durationSec,
                })),
              },
            });
            return;
          }
          await babyGraphQLRequest(MUTATION, { input });
        },
        onSuccess: async () => {
          writeSlots(
            withCareTimerSide(slots, {
              babyId,
              side: null,
              now: Date.now(),
              clearFamily: "pump",
            }),
          );
          const flash = babyHomeBreastDoneSide({
            stopBreastSession: true,
            side,
          });
          if (
            flash === "pump_l" ||
            flash === "pump_r" ||
            flash === "pump_both"
          ) {
            setDoneSide(flash);
            doneTimerRef.current.arm(() => setDoneSide(null));
          }
          await invalidateBabyQueries(queryClient, "care");
          notify.success(t("pump.saved"));
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

  function logPumpAmount(ml: number, fromCustom = pumpFromCustom) {
    if (pending) return;
    const occurredAt =
      fromCustom && pumpCustomIso ? pumpCustomIso : undefined;
    startTransition(async () => {
      await runBabyCareSaveThenNavigate({
        mutate: async () => {
          await babyGraphQLRequest(MUTATION, {
            input: {
              method: "pump",
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
          setPumpOverride(null);
          setPumpFromCustom(keepFromCustom);
          if (!keepFromCustom) setPumpCustomIso(null);
          if (flash != null) {
            setDoneMl(flash);
            doneTimerRef.current.arm(() => {
              setDoneMl(null);
              setPumpFromCustom(false);
              setPumpCustomIso(null);
            });
          }
          await invalidateBabyQueries(queryClient, "care");
          notify.success(t("pump.saved"));
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

  const pump = slots?.pump ?? null;
  const pumpElapsed = pump
    ? formatBabyDurationTimer(babyBreastElapsedSec(pump.startedAt, nowMs))
    : undefined;
  const pumpCustomMl = babyHomeCustomInitialMl({
    formulaOverride: pumpOverride,
    birthDate: null,
    suggestedMl: pumpDefault,
    firstChipMl: pumpChipMls[0] ?? null,
  });

  return (
    <div
      className={cn(SHELL_DASHBOARD_STACK, SHELL_FULL_SPAN, "fx-fade-in")}
      data-testid="baby-pump-form"
    >
      <div
        className="grid gap-x-3 gap-y-2"
        style={{
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
        }}
        data-testid="baby-pump-timer-chips"
      >
        <BabyPumpSidePair
          sides={[
            {
              side: "pump_l",
              "data-testid": "baby-pump-method-pump_l",
              label: babyTimedCareChipLabel({
                running: pump?.side === "pump_l",
                idleLabel: t("home.pumpL"),
                endTitle: t("home.pumpL"),
                tapToStop: t("home.tapToStop"),
              }),
              running: pump?.side === "pump_l",
              elapsedText: pump?.side === "pump_l" ? pumpElapsed : undefined,
              tapToStart: t("home.tapToStart"),
              tapToStop: t("home.tapToStop"),
              doneText: doneSide === "pump_l" ? t("home.done") : null,
              disabled: pending,
              onPress: () => pressPumpSide("pump_l"),
            },
            {
              side: "pump_r",
              "data-testid": "baby-pump-method-pump_r",
              label: babyTimedCareChipLabel({
                running: pump?.side === "pump_r",
                idleLabel: t("home.pumpR"),
                endTitle: t("home.pumpR"),
                tapToStop: t("home.tapToStop"),
              }),
              running: pump?.side === "pump_r",
              elapsedText: pump?.side === "pump_r" ? pumpElapsed : undefined,
              tapToStart: t("home.tapToStart"),
              tapToStop: t("home.tapToStop"),
              doneText: doneSide === "pump_r" ? t("home.done") : null,
              disabled: pending,
              onPress: () => pressPumpSide("pump_r"),
            },
            {
              side: "pump_both",
              "data-testid": "baby-pump-method-pump_both",
              label: babyTimedCareChipLabel({
                running: pump?.side === "pump_both",
                idleLabel: t("home.pumpBoth"),
                endTitle: t("home.pumpBoth"),
                tapToStop: t("home.tapToStop"),
              }),
              running: pump?.side === "pump_both",
              elapsedText:
                pump?.side === "pump_both" ? pumpElapsed : undefined,
              tapToStart: t("home.tapToStart"),
              tapToStop: t("home.tapToStop"),
              doneText: doneSide === "pump_both" ? t("home.done") : null,
              disabled: pending,
              onPress: () => pressPumpSide("pump_both"),
            },
          ]}
        />
        <BabyMlChipSection
          data-section="pump-amount"
          mls={pumpChipMls}
          selectedMl={selectedPumpMl}
          doneFlash={doneMl != null}
          doneText={t("home.done")}
          disabled={pending}
          customSelected={pumpCustomSelected}
          showEditCustom={pumpCustomSelected}
          onEditCustom={() => {
            if (pending) return;
            setCustomOpen(true);
          }}
          className="h-full"
          groupLabel={t("home.pumpAmount")}
          onSelectMl={(ml) => {
            const wasCustomOrigin = pumpFromCustom && pumpOverride === ml;
            if (!wasCustomOrigin) {
              setPumpFromCustom(false);
              setPumpCustomIso(null);
            }
            setPumpOverride(ml);
            logPumpAmount(ml, wasCustomOrigin);
          }}
          onCustom={() => {
            if (pending) return;
            if (
              babyHomeCustomMlTapAction({
                fromCustom: pumpFromCustom,
                override: pumpOverride,
              }) === "save"
            ) {
              logPumpAmount(pumpOverride!, true);
              return;
            }
            setCustomOpen(true);
          }}
          t={t}
        />
      </div>

      <BabyCustomMlModal
        open={customOpen}
        initialMl={pumpCustomMl}
        initialIso={pumpCustomIso}
        onClose={() => setCustomOpen(false)}
        onConfirm={({ ml, iso }) => {
          // Confirm sets ml + time — second Custom tap saves (D4).
          setPumpOverride(ml);
          setPumpCustomIso(iso);
          setPumpFromCustom(true);
          setCustomOpen(false);
        }}
        t={t}
      />
    </div>
  );
}
