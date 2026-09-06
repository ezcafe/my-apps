"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useBabyLocale } from "@/components/baby-locale-provider";
import { useNotify } from "@/components/notification-provider";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { babyGraphQLRequest } from "@/lib/baby-gql-client";
import { runBabyCareSaveThenNavigate } from "@/lib/baby-care-save-navigate";
import {
  BABY_GROWTH_KIND_CHIPS,
  babyMeasureKindFilter,
  selectBabyGrowthKindChip,
  type BabyGrowthKindChip,
} from "@/lib/baby-growth-kind-chips";
import { babyMeasureListState } from "@/lib/baby-measure-list-state";
import {
  babyGrowthNextPageParam,
  babyKeys,
  fetchBabyGrowthPage,
  invalidateBabyQueries,
  type BabyGrowthEntryRow,
} from "@/lib/baby-query-options";
import { cn } from "@/lib/cn";
import type { BabyMessageKey } from "@/messages/baby/en";
import {
  quickPickChipCls,
  quickPickGroupCls,
} from "@/lib/money-quick-pick-chip-cls";
import { SHELL_DASHBOARD_STACK, SHELL_FULL_SPAN } from "@/lib/shell-layout";
import { BabyMeasureListSkeleton } from "@/components/baby-page-skeleton";

const CREATE = /* GraphQL */ `
  mutation CreateBabyGrowth($input: CreateBabyGrowthInput!) {
    createBabyGrowth(input: $input) {
      id
    }
  }
`;

const UPDATE = /* GraphQL */ `
  mutation UpdateBabyGrowth($input: UpdateBabyGrowthInput!) {
    updateBabyGrowth(input: $input) {
      id
    }
  }
`;

const DELETE = /* GraphQL */ `
  mutation DeleteBabyGrowth($id: ID!) {
    deleteBabyGrowth(id: $id) {
      id
    }
  }
`;

const KINDS = BABY_GROWTH_KIND_CHIPS;

type Kind = BabyGrowthKindChip;

function kindLabelKey(kind: string): BabyMessageKey {
  if (kind === "weight") return "growth.weight";
  if (kind === "height") return "growth.height";
  if (kind === "head") return "growth.head";
  if (kind === "temperature") return "growth.temperature";
  if (kind === "medication") return "growth.medication";
  return "growth.kind";
}

/** Capture form + recent list/edit/delete for growth measurements. */
export function BabyMeasurePage() {
  const { t } = useBabyLocale();
  const notify = useNotify();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [loadMorePending, startLoadMore] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>("weight");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("kg");

  const growthQuery = useInfiniteQuery({
    queryKey: babyKeys.growth(),
    queryFn: ({ pageParam }) =>
      fetchBabyGrowthPage({ cursor: pageParam, limit: 50 }),
    initialPageParam: null as string | null,
    getNextPageParam: (last, pages) => babyGrowthNextPageParam(last, pages),
  });

  const entries: BabyGrowthEntryRow[] =
    growthQuery.data?.pages.flatMap((p) => p.babyGrowthEntries.items) ?? [];
  const visibleEntries: BabyGrowthEntryRow[] = babyMeasureKindFilter(
    entries,
    kind,
  );

  function resetForm() {
    setEditingId(null);
    setKind("weight");
    setValue("");
    setUnit("kg");
  }

  function startEdit(entry: (typeof entries)[number]) {
    setEditingId(entry.id);
    setKind(
      (KINDS.includes(entry.kind as Kind) ? entry.kind : "weight") as Kind,
    );
    setValue(entry.valueNum != null ? String(entry.valueNum) : "");
    setUnit(entry.unit ?? "");
  }

  function save() {
    startTransition(async () => {
      if (editingId) {
        try {
          await babyGraphQLRequest(UPDATE, {
            input: {
              id: editingId,
              kind,
              valueNum: value ? Number(value) : null,
              unit: unit || null,
            },
          });
          await invalidateBabyQueries(queryClient, "growth");
          notify.success(t("growth.saved"));
          resetForm();
        } catch (e) {
          notify.error(e instanceof Error ? e.message : t("common.failed"));
        }
        return;
      }

      await runBabyCareSaveThenNavigate({
        mutate: async () => {
          await babyGraphQLRequest(CREATE, {
            input: {
              kind,
              valueNum: value ? Number(value) : undefined,
              unit: unit || undefined,
            },
          });
        },
        onSuccess: async () => {
          await invalidateBabyQueries(queryClient, "growth");
          notify.success(t("growth.saved"));
        },
        onError: (e) => {
          notify.error(e instanceof Error ? e.message : t("common.failed"));
        },
        router,
      });
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      try {
        await babyGraphQLRequest(DELETE, { id });
        await invalidateBabyQueries(queryClient, "growth");
        notify.success(t("growth.deleted"));
        if (editingId === id) resetForm();
      } catch (e) {
        notify.error(e instanceof Error ? e.message : t("common.failed"));
      }
    });
  }

  const hasMore = Boolean(growthQuery.hasNextPage);
  const listState = babyMeasureListState({
    isLoading: growthQuery.isLoading,
    isError: growthQuery.isError,
    entryCount: visibleEntries.length,
  });

  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
      data-testid="baby-measure-page"
    >
      <div
        className={quickPickGroupCls}
        role="radiogroup"
        aria-label={t("growth.kind")}
        data-testid="baby-measure-kind-chips"
      >
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            className={quickPickChipCls(kind === k)}
            onClick={() => setKind(selectBabyGrowthKindChip(kind, k))}
          >
            {t(kindLabelKey(k))}
          </button>
        ))}
      </div>

      <section
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 10rem), 1fr))",
        }}
      >
        <Field label={t("growth.value")}>
          <Input
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        <Field label={t("growth.unit")}>
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
        </Field>
        <div className="flex flex-wrap items-end gap-2">
          <Button type="button" size="lg" disabled={pending} onClick={save}>
            {editingId ? t("growth.saveEdit") : t("growth.add")}
          </Button>
          {editingId ? (
            <Button
              type="button"
              size="lg"
              variant="ghost"
              disabled={pending}
              onClick={resetForm}
            >
              {t("common.cancel")}
            </Button>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">
          {t("measure.entries")}
        </h2>
        {listState === "loading" ? (
          <BabyMeasureListSkeleton />
        ) : listState === "error" ? (
          <p className="text-destructive">{t("insights.loadGrowthError")}</p>
        ) : listState === "empty" ? (
          <p className="text-sm text-muted">{t("growth.noData")}</p>
        ) : (
          <ul className="fx-stagger-children divide-y divide-border/80 border-y border-border/80">
            {visibleEntries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {t(kindLabelKey(entry.kind))}
                    {entry.valueNum != null
                      ? ` ${entry.valueNum}${entry.unit ? ` ${entry.unit}` : ""}`
                      : ""}
                  </p>
                  <p className="text-sm text-muted">
                    {new Date(entry.recordedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => startEdit(entry)}
                  >
                    {t("growth.edit")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    disabled={pending}
                    onClick={() => remove(entry.id)}
                  >
                    {t("growth.delete")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {hasMore ? (
          <Button
            type="button"
            size="lg"
            variant="secondary"
            disabled={loadMorePending || growthQuery.isFetchingNextPage}
            onClick={() =>
              startLoadMore(() => {
                void growthQuery.fetchNextPage();
              })
            }
          >
            {t("timeline.loadMore")}
          </Button>
        ) : null}
      </section>
    </div>
  );
}
