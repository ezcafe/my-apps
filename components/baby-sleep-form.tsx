"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useBabyLocale } from "@/components/baby-locale-provider";
import { useNotify } from "@/components/notification-provider";
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
  const checkGen = useRef(0);

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
      await runBabyCareSaveThenNavigate({
        mutate: async () => {
          await babyGraphQLRequest(START, { input: {} });
        },
        onSuccess: async () => {
          setHasOpenSleep(true);
          setEndEnabled(true);
          setOpenChecked(true);
          setCheckFailed(false);
          setCheckIncomplete(false);
          await invalidateBabyQueries(queryClient, "care");
          notify.success(t("sleep.started"));
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
        afterSave: BABY_CARE_AFTER_SAVE.sleepStart,
      });
    });
  }

  function end() {
    startTransition(async () => {
      await runBabyCareSaveThenNavigate({
        mutate: async () => {
          await babyGraphQLRequest(END, { input: {} });
        },
        onSuccess: async () => {
          setHasOpenSleep(false);
          setEndEnabled(false);
          setOpenChecked(true);
          setCheckFailed(false);
          setCheckIncomplete(false);
          await invalidateBabyQueries(queryClient, "care");
          notify.success(t("sleep.ended"));
        },
        onError: (e) => {
          notify.error(e instanceof Error ? e.message : t("common.failed"));
        },
        router,
        afterSave: BABY_CARE_AFTER_SAVE.sleepEnd,
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
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
        }}
      >
        <Button
          type="button"
          size="lg"
          className="min-h-14"
          disabled={startDisabled}
          onClick={start}
        >
          {t("sleep.start")}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="secondary"
          className="min-h-14"
          disabled={pending || checkPending || !endEnabled}
          onClick={end}
        >
          {t("sleep.end")}
        </Button>
      </div>
    </div>
  );
}
