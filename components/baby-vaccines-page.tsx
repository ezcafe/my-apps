"use client";

import { useState, useTransition } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useBabyLocale } from "@/components/baby-locale-provider";
import { BabyVaccinesPageSkeleton } from "@/components/baby-page-skeleton";
import { useNotify } from "@/components/notification-provider";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { babyGraphQLRequest } from "@/lib/baby-gql-client";
import {
  babyVaccinesInfiniteQueryOptions,
  invalidateBabyQueries,
} from "@/lib/baby-query-options";
import {
  babyVaccineDoseLabelKey,
  babyVaccineHasMorePages,
  babyVaccineListCopy,
  babyVaccineListState,
} from "@/lib/baby-vaccine-list-state";
import { cn } from "@/lib/cn";
import {
  quickPickChipCls,
  quickPickGroupCls,
} from "@/lib/money-quick-pick-chip-cls";
import { SHELL_DASHBOARD_STACK, SHELL_FULL_SPAN } from "@/lib/shell-layout";

const CREATE = /* GraphQL */ `
  mutation CreateBabyVaccine($input: CreateBabyVaccineInput!) {
    createBabyVaccine(input: $input) {
      id
    }
  }
`;

type Dose = "first" | "second";

export function BabyVaccinesPage() {
  const { t } = useBabyLocale();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [loadMorePending, startLoadMore] = useTransition();
  const [name, setName] = useState("");
  const [dose, setDose] = useState<Dose>("first");

  const listQuery = useInfiniteQuery(babyVaccinesInfiniteQueryOptions());
  const entries =
    listQuery.data?.pages.flatMap((p) => p.babyVaccines.items) ?? [];
  const nextCursor =
    listQuery.data?.pages.at(-1)?.babyVaccines.nextCursor ?? null;
  const listIncomplete = babyVaccineHasMorePages(nextCursor);
  const canLoadMore = Boolean(listQuery.hasNextPage);
  const listCopy = babyVaccineListCopy({
    entryCount: entries.length,
    listIncomplete,
    canLoadMore,
  });
  const listState = babyVaccineListState({
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    entryCount: entries.length,
  });

  function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      notify.error(t("vaccine.nameRequired"));
      return;
    }
    startTransition(async () => {
      try {
        await babyGraphQLRequest(CREATE, {
          input: { name: trimmed, dose },
        });
        await invalidateBabyQueries(queryClient, "vaccines");
        notify.success(t("vaccine.saved"));
        setName("");
        setDose("first");
      } catch (e) {
        notify.error(e instanceof Error ? e.message : t("common.failed"));
      }
    });
  }

  if (listState === "loading") {
    return <BabyVaccinesPageSkeleton />;
  }

  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
      data-testid="baby-vaccines-page"
    >
      <section className="space-y-3">
        <Field label={t("vaccine.name")}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="off"
          />
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">
            {t("vaccine.dose")}
          </p>
          <div className={quickPickGroupCls} role="radiogroup" aria-label={t("vaccine.dose")}>
            {(["first", "second"] as const).map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={dose === d}
                className={quickPickChipCls(dose === d)}
                onClick={() => setDose(d)}
              >
                {t(babyVaccineDoseLabelKey(d))}
              </button>
            ))}
          </div>
        </div>
        <Button type="button" size="lg" disabled={pending} onClick={save}>
          {t("vaccine.add")}
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">
          {t("vaccine.entries")}
        </h2>
        {listState === "error" ? (
          <p className="text-destructive">{t("vaccine.loadError")}</p>
        ) : listState === "empty" ? (
          <p className="text-sm text-muted">{t("vaccine.empty")}</p>
        ) : (
          <>
            {listCopy === "partial" ? (
              <p className="text-xs text-muted">{t("vaccine.partialList")}</p>
            ) : listCopy === "partialCapped" ? (
              <p className="text-xs text-muted">
                {t("vaccine.partialListCapped")}
              </p>
            ) : null}
            <ul className="fx-stagger-children divide-y divide-border/80 border-y border-border/80">
              {entries.map((entry) => (
                <li key={entry.id} className="py-3" data-testid="baby-vaccine-row">
                  <p className="font-medium text-foreground">
                    {entry.name} · {t(babyVaccineDoseLabelKey(entry.dose))}
                  </p>
                  <p className="text-sm text-muted">
                    {new Date(entry.administeredAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
            {canLoadMore ? (
              <Button
                type="button"
                size="lg"
                variant="secondary"
                disabled={loadMorePending || listQuery.isFetchingNextPage}
                onClick={() =>
                  startLoadMore(() => {
                    void listQuery.fetchNextPage();
                  })
                }
              >
                {t("timeline.loadMore")}
              </Button>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
