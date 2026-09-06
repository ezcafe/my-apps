"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useBabyLocale } from "@/components/baby-locale-provider";
import { useNotify } from "@/components/notification-provider";
import { babyGraphQLRequest } from "@/lib/baby-gql-client";
import {
  BABY_CARE_AFTER_SAVE,
  runBabyCareSaveThenNavigate,
} from "@/lib/baby-care-save-navigate";
import { isBabyFeedStartDisabled } from "@/lib/baby-care-session-state";
import { formatBabyDurationCompact } from "@/lib/baby-format-duration";
import { invalidateBabyQueries } from "@/lib/baby-query-options";
import { cn } from "@/lib/cn";
import { SHELL_DASHBOARD_STACK, SHELL_FULL_SPAN } from "@/lib/shell-layout";

const METHODS = [
  { method: "breast_l", key: "feed.breastL" },
  { method: "breast_r", key: "feed.breastR" },
  { method: "formula", key: "feed.formula" },
  { method: "pump", key: "feed.pump" },
] as const;

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
  const [amountMl, setAmountMl] = useState("");
  const [durationSec, setDurationSec] = useState("");
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!timerRunning || timerStartedAt == null) return;
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - timerStartedAt) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [timerRunning, timerStartedAt]);

  function startTimer() {
    if (isBabyFeedStartDisabled(timerRunning)) return;
    setElapsedSec(0);
    setDurationSec("");
    setTimerStartedAt(Date.now());
    setTimerRunning(true);
  }

  function endTimer() {
    if (!timerRunning) return;
    const sec = Math.max(1, elapsedSec);
    setTimerRunning(false);
    setDurationSec(String(sec));
    setTimerStartedAt(null);
    setElapsedSec(sec);
  }

  function log(method: (typeof METHODS)[number]["method"]) {
    const duration =
      durationSec.trim() !== ""
        ? Number(durationSec)
        : timerRunning && elapsedSec > 0
          ? elapsedSec
          : undefined;
    startTransition(async () => {
      await runBabyCareSaveThenNavigate({
        mutate: async () => {
          await babyGraphQLRequest(MUTATION, {
            input: {
              method,
              ...(amountMl ? { amountMl: Number(amountMl) } : {}),
              ...(duration != null && Number.isFinite(duration) && duration > 0
                ? { durationSec: Math.floor(duration) }
                : {}),
            },
          });
        },
        onSuccess: async () => {
          setTimerRunning(false);
          setTimerStartedAt(null);
          setElapsedSec(0);
          setDurationSec("");
          await invalidateBabyQueries(queryClient, "care");
          notify.success(t("feed.saved"));
        },
        onError: (e) => {
          notify.error(e instanceof Error ? e.message : t("common.failed"));
        },
        router,
        afterSave: BABY_CARE_AFTER_SAVE.feedMethod,
      });
    });
  }

  const startDisabled = isBabyFeedStartDisabled(timerRunning, pending);
  const displaySec = timerRunning ? elapsedSec : Number(durationSec) || 0;

  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
    >
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 10rem), 1fr))",
        }}
      >
        <Button
          type="button"
          size="lg"
          className="min-h-14"
          disabled={startDisabled}
          onClick={startTimer}
        >
          {t("feed.timerStart")}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="secondary"
          className="min-h-14"
          disabled={!timerRunning || pending}
          onClick={endTimer}
        >
          {t("feed.timerStop")}
        </Button>
      </div>

      {(timerRunning || displaySec > 0) && (
        <p className="text-lg font-medium text-foreground tabular-nums" aria-live="polite">
          {formatBabyDurationCompact(displaySec)}
          {timerRunning ? ` · ${t("feed.timerRunning")}` : null}
        </p>
      )}

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 10rem), 1fr))",
        }}
      >
        {METHODS.map((m) => (
          <Button
            key={m.method}
            type="button"
            size="lg"
            className={cn("min-h-14")}
            disabled={pending}
            onClick={() => log(m.method)}
          >
            {t(m.key)}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Field label={t("feed.amountMl")} className="max-w-xs">
          <Input
            type="number"
            inputMode="decimal"
            value={amountMl}
            onChange={(e) => setAmountMl(e.target.value)}
          />
        </Field>
        <Field label={t("feed.durationSec")} className="max-w-xs">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={timerRunning ? String(elapsedSec) : durationSec}
            onChange={(e) => setDurationSec(e.target.value)}
            disabled={timerRunning}
          />
        </Field>
      </div>
    </div>
  );
}
