"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useBabyLocale } from "@/components/baby-locale-provider";
import { useNotify } from "@/components/notification-provider";
import { babyGraphQLRequest } from "@/lib/baby-gql-client";
import {
  BABY_CARE_AFTER_SAVE,
  runBabyCareSaveThenNavigate,
} from "@/lib/baby-care-save-navigate";
import { invalidateBabyQueries } from "@/lib/baby-query-options";
import { cn } from "@/lib/cn";
import { SHELL_DASHBOARD_STACK, SHELL_FULL_SPAN } from "@/lib/shell-layout";

const KINDS = [
  { kind: "wet", key: "diaper.wet" },
  { kind: "dirty", key: "diaper.dirty" },
  { kind: "mixed", key: "diaper.mixed" },
] as const;

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

  function log(kind: (typeof KINDS)[number]["kind"]) {
    startTransition(async () => {
      await runBabyCareSaveThenNavigate({
        mutate: async () => {
          await babyGraphQLRequest(MUTATION, { input: { kind } });
        },
        onSuccess: async () => {
          await invalidateBabyQueries(queryClient, "care");
          notify.success(t("diaper.saved"));
        },
        onError: (e) => {
          notify.error(e instanceof Error ? e.message : t("common.failed"));
        },
        router,
        afterSave: BABY_CARE_AFTER_SAVE.diaper,
      });
    });
  }

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
        {KINDS.map((k) => (
          <Button
            key={k.kind}
            type="button"
            size="lg"
            className="min-h-14"
            disabled={pending}
            onClick={() => log(k.kind)}
          >
            {t(k.key)}
          </Button>
        ))}
      </div>
    </div>
  );
}
