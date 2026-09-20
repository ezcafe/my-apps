"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { BabyCustomTimeChip } from "@/components/baby-custom-time-chip";
import { BabyCustomTimeModal } from "@/components/baby-custom-time-modal";
import { BabyDiaperDetailSheet } from "@/components/baby-diaper-detail-sheet";
import { BabyDiaperKindControl } from "@/components/baby-diaper-kind-control";
import { useBabyLocale } from "@/components/baby-locale-provider";
import { useNotify } from "@/components/notification-provider";
import { babyGraphQLRequest } from "@/lib/baby-gql-client";
import {
  BABY_CARE_AFTER_SAVE,
  runBabyCareSaveThenNavigate,
} from "@/lib/baby-care-save-navigate";
import type { BabyDiaperKind } from "@/lib/baby-diaper-detail";
import {
  planBabyDiaperKindTap,
  type BabyDiaperQuickPlan,
} from "@/lib/baby-diaper-quick-plan";
import {
  BABY_CARE_DONE_BEFORE_NAV_MS,
  babyHomeDiaperDoneKind,
  createBabyHomeDoneFlashTimer,
} from "@/lib/baby-home-done-flash";
import {
  babyHomeIsoToLocalInput,
  babyLogDiaperMutationInput,
  clearBabyHomeCustomClockPending,
} from "@/lib/baby-home-custom-time";
import { invalidateBabyQueries } from "@/lib/baby-query-options";
import { cn } from "@/lib/cn";
import { SHELL_DASHBOARD_STACK, SHELL_FULL_SPAN } from "@/lib/shell-layout";

const MUTATION = /* GraphQL */ `
  mutation CreateBabyDiaper($input: CreateBabyDiaperInput!) {
    createBabyDiaper(input: $input) {
      id
    }
  }
`;

export function BabyDiaperForm() {
  const { t } = useBabyLocale();
  const notify = useNotify();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [doneKind, setDoneKind] = useState<BabyDiaperKind | null>(null);
  const [diaperSheet, setDiaperSheet] = useState<{
    diaperKind: "dirty" | "mixed";
  } | null>(null);
  const [customTimeIso, setCustomTimeIso] = useState<string | null>(null);
  const customTimeIsoRef = useRef<string | null>(null);
  customTimeIsoRef.current = customTimeIso;
  const [customTimeOpen, setCustomTimeOpen] = useState(false);
  const doneTimerRef = useRef(createBabyHomeDoneFlashTimer());

  useEffect(() => {
    const host = doneTimerRef.current;
    return () => host.dispose();
  }, []);

  function saveDiaper(input: {
    kind: BabyDiaperKind;
    diaperColor?: string | null;
    diaperTexture?: string | null;
    diaperAmount?: string | null;
    pendingIso?: string | null;
  }) {
    const pendingIso =
      input.pendingIso !== undefined
        ? input.pendingIso
        : customTimeIsoRef.current;
    startTransition(async () => {
      await runBabyCareSaveThenNavigate({
        mutate: async () => {
          await babyGraphQLRequest(MUTATION, {
            input: babyLogDiaperMutationInput({
              kind: input.kind,
              diaperColor: input.diaperColor,
              diaperTexture: input.diaperTexture,
              diaperAmount: input.diaperAmount,
              pendingIso,
            }),
          });
        },
        onSuccess: async () => {
          setDiaperSheet(null);
          customTimeIsoRef.current = null;
          setCustomTimeIso(clearBabyHomeCustomClockPending());
          const dk = babyHomeDiaperDoneKind(input.kind);
          if (dk) {
            setDoneKind(dk);
            doneTimerRef.current.arm(() => setDoneKind(null));
          }
          await invalidateBabyQueries(queryClient, "care");
          notify.success(t("diaper.saved"));
        },
        onError: (e) => {
          notify.error(e instanceof Error ? e.message : t("common.failed"));
        },
        router,
        afterSave: BABY_CARE_AFTER_SAVE.diaper,
        homeNavigateDelayMs: BABY_CARE_DONE_BEFORE_NAV_MS,
      });
    });
  }

  function onPlan(plan: BabyDiaperQuickPlan) {
    if (pending) return;
    if (plan.kind === "instantSave") {
      saveDiaper({ kind: plan.diaperKind });
      return;
    }
    setDiaperSheet({ diaperKind: plan.diaperKind });
  }

  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
      data-testid="baby-diaper-form"
    >
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        }}
        data-layout="diaper-form-row"
      >
        <BabyDiaperKindControl
          disabled={pending}
          doneKind={doneKind}
          doneText={t("home.done")}
          onPlan={onPlan}
          t={t}
        />
        <BabyCustomTimeChip
          data-testid="baby-diaper-custom-time"
          label={t("home.customDiaper")}
          valueText={
            customTimeIso
              ? babyHomeIsoToLocalInput(customTimeIso).slice(11)
              : ""
          }
          selected={customTimeIso != null}
          disabled={pending}
          onPress={() => setCustomTimeOpen(true)}
        />
      </div>

      <BabyCustomTimeModal
        open={customTimeOpen}
        fields="time+diaperKind"
        initialIso={customTimeIso}
        onClose={() => setCustomTimeOpen(false)}
        onConfirm={({ iso, diaperKind }) => {
          if (!diaperKind) return;
          customTimeIsoRef.current = iso;
          setCustomTimeIso(iso);
          setCustomTimeOpen(false);
          onPlan(planBabyDiaperKindTap(diaperKind));
        }}
        onClear={() => {
          customTimeIsoRef.current = null;
          setCustomTimeIso(clearBabyHomeCustomClockPending());
        }}
        t={t}
      />

      {diaperSheet ? (
        <BabyDiaperDetailSheet
          key={diaperSheet.diaperKind}
          open
          diaperKind={diaperSheet.diaperKind}
          saving={pending}
          onClose={() => setDiaperSheet(null)}
          onSave={(mutation) => {
            saveDiaper({
              kind: mutation.diaperKind,
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
