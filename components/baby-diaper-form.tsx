"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
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
import type { BabyDiaperQuickPlan } from "@/lib/baby-diaper-quick-plan";
import {
  BABY_CARE_DONE_BEFORE_NAV_MS,
  babyHomeDiaperDoneKind,
  createBabyHomeDoneFlashTimer,
} from "@/lib/baby-home-done-flash";
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
  }) {
    startTransition(async () => {
      await runBabyCareSaveThenNavigate({
        mutate: async () => {
          await babyGraphQLRequest(MUTATION, {
            input: {
              kind: input.kind,
              ...(input.diaperColor ? { color: input.diaperColor } : {}),
              ...(input.diaperTexture ? { texture: input.diaperTexture } : {}),
              ...(input.diaperAmount ? { amount: input.diaperAmount } : {}),
            },
          });
        },
        onSuccess: async () => {
          setDiaperSheet(null);
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
      <BabyDiaperKindControl
        disabled={pending}
        doneKind={doneKind}
        doneText={t("home.done")}
        onPlan={onPlan}
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
