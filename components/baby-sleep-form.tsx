"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { BabyTimedCareChip, babyTimedCareChipLabel } from "@/components/baby-timed-care-chip";
import { BabyCustomTimeChip } from "@/components/baby-custom-time-chip";
import { BabyCustomTimeModal } from "@/components/baby-custom-time-modal";
import { Button } from "@/components/ui/button";
import { useBabyLocale } from "@/components/baby-locale-provider";
import { useNotify } from "@/components/notification-provider";
import { IconBabySleep } from "@/components/icons/icon-baby-nav";
import { babyGraphQLRequest } from "@/lib/baby-gql-client";
import {
  BABY_CARE_AFTER_SAVE,
  runBabyCareSaveThenNavigate,
} from "@/lib/baby-care-save-navigate";
import {
  babyOpenSleepCheckState,
  isBabySleepStartDisabled,
  openSleepScanFromQuery,
} from "@/lib/baby-care-session-state";
import {
  BABY_CARE_DONE_BEFORE_NAV_MS,
  babyHomeSleepDoneFlash,
  createBabyHomeDoneFlashTimer,
} from "@/lib/baby-home-done-flash";
import {
  babyHomeIsoToLocalInput,
  babyHomeNapEndedAtIso,
  babyLogSleepEndMutationInput,
  babyLogSleepStartMutationInput,
  clearBabyHomeCustomClockPending,
} from "@/lib/baby-home-custom-time";
import { invalidateBabyQueries } from "@/lib/baby-query-options";
import { cn } from "@/lib/cn";
import { SHELL_DASHBOARD_STACK, SHELL_FULL_SPAN } from "@/lib/shell-layout";

const START = /* GraphQL */ `
  mutation StartBabySleep($input: StartBabySleepInput) {
    startBabySleep(input: $input) {
      id
    }
  }
`;

const END = /* GraphQL */ `
  mutation EndBabySleep($input: EndBabySleepInput) {
    endBabySleep(input: $input) {
      id
    }
  }
`;

/** Indexed open-nap read — one round-trip (not a timeline page walk). */
const OPEN_SLEEP_Q = /* GraphQL */ `
  query BabyOpenSleep {
    babyOpenSleep {
      id
      type
      endedAt
    }
  }
`;

export function BabySleepForm() {
  const { t } = useBabyLocale();
  const notify = useNotify();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [hasOpenSleep, setHasOpenSleep] = useState(false);
  const [openChecked, setOpenChecked] = useState(false);
  const [endEnabled, setEndEnabled] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);
  const [checkIncomplete, setCheckIncomplete] = useState(false);
  const [checkPending, setCheckPending] = useState(true);
  const [sleepDone, setSleepDone] = useState(false);
  const [customTimeIso, setCustomTimeIso] = useState<string | null>(null);
  const [customDurationMinutes, setCustomDurationMinutes] = useState<
    number | null
  >(null);
  const [customTimeOpen, setCustomTimeOpen] = useState(false);
  const checkGen = useRef(0);
  const doneTimerRef = useRef(createBabyHomeDoneFlashTimer());

  useEffect(() => {
    const host = doneTimerRef.current;
    return () => host.dispose();
  }, []);

  const applyOpenSleepUi = useCallback(
    (next: ReturnType<typeof babyOpenSleepCheckState>) => {
      setHasOpenSleep(next.hasOpenSleep);
      setOpenChecked(next.openChecked);
      setEndEnabled(next.endEnabled);
      setCheckFailed(next.checkFailed);
      setCheckIncomplete(next.checkIncomplete);
    },
    [],
  );

  const runOpenSleepCheck = useCallback(async () => {
    const gen = ++checkGen.current;
    setCheckPending(true);
    setCheckFailed(false);
    setCheckIncomplete(false);
    try {
      const data = await babyGraphQLRequest<{
        babyOpenSleep: {
          id: string;
          type: string;
          endedAt: string | null;
        } | null;
      }>(OPEN_SLEEP_Q);
      if (gen !== checkGen.current) return;
      applyOpenSleepUi(
        babyOpenSleepCheckState(openSleepScanFromQuery(data.babyOpenSleep)),
      );
    } catch {
      if (gen !== checkGen.current) return;
      // Fail closed: Start stays disabled until check succeeds.
      applyOpenSleepUi(babyOpenSleepCheckState("error"));
    } finally {
      if (gen === checkGen.current) setCheckPending(false);
    }
  }, [applyOpenSleepUi]);

  useEffect(() => {
    void runOpenSleepCheck();
    return () => {
      checkGen.current += 1;
    };
  }, [runOpenSleepCheck]);

  function start() {
    startTransition(async () => {
      const startIso = customTimeIso;
      const durationMinutes = customDurationMinutes;
      await runBabyCareSaveThenNavigate({
        mutate: async () => {
          await babyGraphQLRequest(START, {
            input: babyLogSleepStartMutationInput(startIso),
          });
          // Pending duration → end immediately at start+duration.
          if (startIso && durationMinutes != null && durationMinutes > 0) {
            await babyGraphQLRequest(END, {
              input: babyLogSleepEndMutationInput(
                babyHomeNapEndedAtIso({
                  startIso,
                  durationMinutes,
                }),
              ),
            });
          }
        },
        onSuccess: async () => {
          const endedWithDuration =
            startIso != null &&
            durationMinutes != null &&
            durationMinutes > 0;
          if (endedWithDuration) {
            setHasOpenSleep(false);
            setEndEnabled(false);
          } else {
            setHasOpenSleep(true);
            setEndEnabled(true);
          }
          setOpenChecked(true);
          setCheckFailed(false);
          setCheckIncomplete(false);
          setCustomTimeIso(clearBabyHomeCustomClockPending());
          setCustomDurationMinutes(null);
          if (endedWithDuration) {
            if (babyHomeSleepDoneFlash({ endedSleepSession: true })) {
              setSleepDone(true);
              doneTimerRef.current.arm(() => setSleepDone(false));
            }
          }
          await invalidateBabyQueries(queryClient, "care");
          notify.success(
            endedWithDuration ? t("sleep.ended") : t("sleep.started"),
          );
        },
        onError: (e) => {
          const msg = e instanceof Error ? e.message : t("common.failed");
          if (/already open|conflict/i.test(msg)) {
            setHasOpenSleep(true);
            setEndEnabled(true);
            setOpenChecked(true);
            setCheckFailed(false);
            setCheckIncomplete(false);
            notify.error(t("sleep.openConflict"));
          } else {
            notify.error(msg);
          }
        },
        router,
        afterSave:
          startIso && durationMinutes != null && durationMinutes > 0
            ? BABY_CARE_AFTER_SAVE.sleepEnd
            : BABY_CARE_AFTER_SAVE.sleepStart,
        ...(startIso && durationMinutes != null && durationMinutes > 0
          ? { homeNavigateDelayMs: BABY_CARE_DONE_BEFORE_NAV_MS }
          : {}),
      });
    });
  }

  function end() {
    startTransition(async () => {
      await runBabyCareSaveThenNavigate({
        mutate: async () => {
          await babyGraphQLRequest(END, {
            input: babyLogSleepEndMutationInput(customTimeIso),
          });
        },
        onSuccess: async () => {
          setHasOpenSleep(false);
          setEndEnabled(false);
          setOpenChecked(true);
          setCheckFailed(false);
          setCheckIncomplete(false);
          setCustomTimeIso(clearBabyHomeCustomClockPending());
          setCustomDurationMinutes(null);
          if (babyHomeSleepDoneFlash({ endedSleepSession: true })) {
            setSleepDone(true);
            doneTimerRef.current.arm(() => setSleepDone(false));
          }
          await invalidateBabyQueries(queryClient, "care");
          notify.success(t("sleep.ended"));
        },
        onError: (e) => {
          notify.error(e instanceof Error ? e.message : t("common.failed"));
        },
        router,
        afterSave: BABY_CARE_AFTER_SAVE.sleepEnd,
        homeNavigateDelayMs: BABY_CARE_DONE_BEFORE_NAV_MS,
      });
    });
  }

  const startDisabled = isBabySleepStartDisabled(hasOpenSleep, {
    openChecked,
    pending: pending || checkPending,
  });

  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
      data-testid="baby-sleep-form"
      data-check-pending={checkPending ? "true" : "false"}
    >
      {hasOpenSleep ? (
        <p className="text-sm text-muted" aria-live="polite">
          {t("sleep.openSession")}
        </p>
      ) : null}
      {checkIncomplete ? (
        <p className="text-sm text-muted" aria-live="polite">
          {t("sleep.checkIncomplete")}
        </p>
      ) : null}
      {checkFailed ? (
        <div className="flex flex-wrap items-center gap-3" role="alert">
          <p className="text-sm text-destructive">{t("sleep.checkFailed")}</p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={checkPending || pending}
            onClick={() => {
              void runOpenSleepCheck();
            }}
          >
            {t("sleep.retryCheck")}
          </Button>
        </div>
      ) : null}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        }}
        data-testid="baby-sleep-action-chips"
      >
        <BabyTimedCareChip
          data-testid={hasOpenSleep ? "baby-sleep-end" : "baby-sleep-start"}
          labelId="baby-sleep-chip"
          label={babyTimedCareChipLabel({
            running: hasOpenSleep,
            idleLabel: t("sleep.start"),
            endTitle: t("sleep.end"),
            tapToStop: t("home.tapToStop"),
          })}
          running={hasOpenSleep}
          tapToStart={t("home.tapToStart")}
          tapToStop={t("home.tapToStop")}
          doneText={sleepDone ? t("home.done") : null}
          disabled={
            hasOpenSleep
              ? pending || checkPending || !endEnabled
              : startDisabled
          }
          onPress={() => {
            if (hasOpenSleep) end();
            else start();
          }}
          icon={<IconBabySleep className="size-6" />}
        />
        <BabyCustomTimeChip
          data-testid="baby-sleep-custom-time"
          label={t("home.customNap")}
          valueText={
            customTimeIso
              ? customDurationMinutes != null
                ? `${babyHomeIsoToLocalInput(customTimeIso).slice(11)} · ${customDurationMinutes}m`
                : babyHomeIsoToLocalInput(customTimeIso).slice(11)
              : ""
          }
          selected={customTimeIso != null}
          disabled={pending || checkPending}
          onPress={() => setCustomTimeOpen(true)}
        />
      </div>
      <BabyCustomTimeModal
        open={customTimeOpen}
        fields="time+duration"
        initialIso={customTimeIso}
        initialDurationMinutes={customDurationMinutes}
        onClose={() => setCustomTimeOpen(false)}
        onConfirm={({ iso, durationMinutes }) => {
          setCustomTimeIso(iso);
          setCustomDurationMinutes(
            durationMinutes != null && durationMinutes > 0
              ? durationMinutes
              : null,
          );
          setCustomTimeOpen(false);
        }}
        onClear={() => {
          setCustomTimeIso(clearBabyHomeCustomClockPending());
          setCustomDurationMinutes(null);
        }}
        t={t}
      />
    </div>
  );
}
