"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { AnalyticsPeriodChip } from "@/components/analytics-period-chip";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowActions,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { BabyActivitySelectionBar } from "@/components/baby-activity-selection-bar";
import {
  BabyActivityAccentBar,
  BabyActivityTypeChip,
} from "@/components/baby-activity-accent";
import { useBabyLocale } from "@/components/baby-locale-provider";
import {
  BabyActivitiesPageSkeleton,
  BabyInsightsListSkeleton,
} from "@/components/baby-page-skeleton";
import { MoneyAnalyticsFiltersBarSkeleton } from "@/components/money-analytics-skeleton";
import {
  BABY_INSIGHTS_CARE_CHIPS,
  BABY_INSIGHTS_GROWTH_CHIPS,
  babyInsightsFiltersDirty,
  emptyBabyInsightsChips,
  filterGrowthByMergedChips,
  filterTimelineByMergedChips,
  filterVaccinesByMergedChips,
  mergeBabyInsightsFilterChips,
  splitBabyInsightsFilterChips,
  type BabyInsightsCareChip,
  type BabyInsightsChipSelection,
  type BabyInsightsFilterState,
} from "@/lib/baby-insights-filters";
import {
  babyInsightsDateBoundsIso,
  babyInsightsDefaultRange,
} from "@/lib/baby-insights-default-range";
import {
  BABY_INSIGHTS_LIST_VISIBLE_CAP,
  babyInsightsNextListVisibleCount,
  babyInsightsVisibleListRows,
} from "@/lib/baby-insights-list-visible";
import {
  babyInsightsDateRangeFilterLabels,
  babyInsightsPeriodChipLabels,
} from "@/lib/baby-insights-chrome-labels";
import { babyInsightsSectionState } from "@/lib/baby-insights-section-state";
import {
  ACTIVITY_LOG_DELETE_CONCURRENCY,
  activityLogDeleteInvalidateScope,
  activityLogDeleteSettleAlert,
  activityLogDeleteTargetsFromKeys,
  activityLogDisplaySummary,
  activityLogRowTitleKey,
  activityLogSelectionKey,
  activityLogStillVisibleSelectionKeys,
  activitySelectionBarEditEnabled,
  mapAllSettledWithConcurrency,
  mergeActivityLogRows,
  pruneActivityLogSelectionAfterDeletes,
  pruneActivityLogSelectionToLoadedKeys,
  type ActivityLogRow,
} from "@/lib/baby-insights-activity-log";
import { activityEditMutationFor } from "@/lib/baby-insights-activity-edit";
import { babyActivitiesListsEnabled } from "@/lib/baby-activities-enable";
import { babyGraphQLRequest } from "@/lib/baby-gql-client";
import {
  BABY_TIMELINE_MAX_PAGES,
  applyBabyTimelineSyncTruncate,
  babyGrowthNextPageParam,
  babyInsightsShouldAutoFetchNextPage,
  babyProfileQueryOptions,
  babySyncConfigQueryOptions,
  babyTimelineNextPageParam,
  babyTimelineSyncShouldFetch,
  babyVaccinesNextPageParam,
  buildBabyInsightsQueryFns,
  invalidateBabyQueries,
  type BabyGrowthInfiniteData,
  type BabyTimelineInfiniteData,
  type BabyVaccinePage,
} from "@/lib/baby-query-options";
import { babyAgeInDays } from "@/lib/baby-age-guide";
import { babyActivityRegularCue } from "@/lib/baby-activity-regular-cue";
import { babyRefetchInterval } from "@/lib/baby-sync-interval";
import { babyVaccineDoseLabelKey } from "@/lib/baby-vaccine-list-state";
import { cn } from "@/lib/cn";
import type { BabyMessageKey } from "@/messages/baby/en";
import { SHELL_DASHBOARD_STACK, SHELL_FULL_SPAN } from "@/lib/shell-layout";

const DELETE_ACTIVITY_EVENT = /* GraphQL */ `
  mutation DeleteBabyEvent($id: ID!) {
    deleteBabyEvent(id: $id) {
      id
    }
  }
`;

const DELETE_ACTIVITY_GROWTH = /* GraphQL */ `
  mutation DeleteBabyGrowth($id: ID!) {
    deleteBabyGrowth(id: $id) {
      id
    }
  }
`;

const DELETE_ACTIVITY_VACCINE = /* GraphQL */ `
  mutation DeleteBabyVaccine($id: ID!) {
    deleteBabyVaccine(id: $id) {
      id
    }
  }
`;

type BabyVaccinesInfiniteData = {
  pages: BabyVaccinePage[];
  pageParams: (string | null)[];
};

function fillTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

const InsightsDateRangeFiltersBar = dynamic(
  () =>
    import("@/components/analytics-filters").then((m) => ({
      default: m.InsightsDateRangeFiltersBar,
    })),
  {
    loading: () => <MoneyAnalyticsFiltersBarSkeleton triggerCount={2} />,
  },
);

const BabyInsightsEditModal = dynamic(
  () =>
    import("@/components/baby-insights-edit-modal").then((m) => ({
      default: m.BabyInsightsEditModal,
    })),
  { ssr: false },
);

function kindLabelKey(kind: string): BabyMessageKey {
  if (kind === "weight") return "growth.weight";
  if (kind === "height") return "growth.height";
  if (kind === "head") return "growth.head";
  if (kind === "temperature") return "growth.temperature";
  if (kind === "medication") return "growth.medication";
  return "growth.kind";
}

function careChipLabelKey(chip: BabyInsightsCareChip): BabyMessageKey {
  if (chip === "feed") return "insights.chipFeed";
  if (chip === "sleep") return "insights.chipSleep";
  return "insights.chipDiaper";
}

function defaultFilterState(): BabyInsightsFilterState {
  const range = babyInsightsDefaultRange();
  return {
    fromDate: range.fromDate,
    toDate: range.toDate,
    chips: emptyBabyInsightsChips(),
  };
}

function activeChipLabels(
  chips: BabyInsightsChipSelection,
  t: (key: BabyMessageKey) => string,
): string[] {
  const labels: string[] = [];
  for (const c of chips.careTypes) labels.push(t(careChipLabelKey(c)));
  for (const g of chips.growthKinds) labels.push(t(kindLabelKey(g)));
  return labels;
}

export function BabyActivitiesPage() {
  const { t } = useBabyLocale();
  const queryClient = useQueryClient();
  const pageDefault = useMemo(() => defaultFilterState(), []);
  const [draft, setDraft] = useState(pageDefault);
  const [applied, setApplied] = useState(pageDefault);
  const [isFilterPending, startFilterTransition] = useTransition();
  const [loadMorePending, startLoadMore] = useTransition();
  const [growthLoadMorePending, startGrowthLoadMore] = useTransition();
  const [vaccinesLoadMorePending, startVaccinesLoadMore] = useTransition();
  const [activityListVisible, setActivityListVisible] = useState(
    BABY_INSIGHTS_LIST_VISIBLE_CAP,
  );
  const [hasSettledListsOnce, setHasSettledListsOnce] = useState(false);
  const [editRow, setEditRow] = useState<ActivityLogRow | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [visibility, setVisibility] =
    useState<DocumentVisibilityState>("visible");

  useEffect(() => {
    setActivityListVisible(BABY_INSIGHTS_LIST_VISIBLE_CAP);
  }, [applied.fromDate, applied.toDate, applied.chips]);

  const dirty = babyInsightsFiltersDirty(draft, applied);
  const periodLabels = useMemo(() => babyInsightsPeriodChipLabels(t), [t]);
  const filterLabels = useMemo(
    () => babyInsightsDateRangeFilterLabels(t),
    [t],
  );
  const careFilterItems = useMemo(
    () => [
      ...BABY_INSIGHTS_CARE_CHIPS.map((chip) => ({
        id: chip,
        label: t(careChipLabelKey(chip)),
      })),
      ...BABY_INSIGHTS_GROWTH_CHIPS.map((chip) => ({
        id: chip,
        label: t(kindLabelKey(chip)),
      })),
    ],
    [t],
  );

  const clearActivitySelection = useCallback(() => {
    setSelectedKeys(new Set());
    setActionError(null);
  }, []);

  const handleApply = useCallback(() => {
    startFilterTransition(() => {
      setApplied(draft);
      setSelectedKeys(new Set());
      setActionError(null);
    });
  }, [draft]);

  const handleReset = useCallback(() => {
    const fresh = defaultFilterState();
    setDraft(fresh);
    startFilterTransition(() => {
      setApplied(fresh);
      setSelectedKeys(new Set());
      setActionError(null);
    });
  }, []);

  const bounds = useMemo(
    () => babyInsightsDateBoundsIso(applied.fromDate, applied.toDate),
    [applied.fromDate, applied.toDate],
  );

  useEffect(() => {
    const onVis = () => setVisibility(document.visibilityState);
    document.addEventListener("visibilitychange", onVis);
    onVis();
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const syncQuery = useQuery(babySyncConfigQueryOptions());
  const profileQuery = useQuery(babyProfileQueryOptions());
  const ageDays = useMemo(() => {
    const birth = profileQuery.data?.babyProfile?.birthDate ?? null;
    return babyAgeInDays(birth, new Date());
  }, [profileQuery.data?.babyProfile?.birthDate]);
  const minutes = syncQuery.data ?? 1;
  const interval = babyRefetchInterval(minutes, visibility);

  const insightsFns = useMemo(
    () => buildBabyInsightsQueryFns(bounds),
    [bounds],
  );

  const listsEnabled = babyActivitiesListsEnabled();

  const [allowTimelineAutoFetch, setAllowTimelineAutoFetch] = useState(true);
  useEffect(() => {
    setAllowTimelineAutoFetch(true);
  }, [bounds.from, bounds.to]);

  const timelineQuery = useInfiniteQuery({
    queryKey: insightsFns.timelineQueryKey,
    queryFn: ({ pageParam }) =>
      insightsFns.timelineQueryFn({ pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last, pages) => babyTimelineNextPageParam(last, pages),
    enabled: listsEnabled,
  });

  const growthQuery = useInfiniteQuery({
    queryKey: insightsFns.growthQueryKey,
    queryFn: ({ pageParam }) =>
      insightsFns.growthQueryFn({ pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last, pages) => babyGrowthNextPageParam(last, pages),
    enabled: listsEnabled,
  });

  const vaccinesQuery = useInfiniteQuery({
    queryKey: insightsFns.vaccinesQueryKey,
    queryFn: ({ pageParam }) =>
      insightsFns.vaccinesQueryFn({ pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last, pages) => babyVaccinesNextPageParam(last, pages),
    enabled: listsEnabled,
  });

  useEffect(() => {
    const settled =
      (timelineQuery.isSuccess || timelineQuery.isError) &&
      (growthQuery.isSuccess || growthQuery.isError) &&
      (vaccinesQuery.isSuccess || vaccinesQuery.isError);
    if (settled) setHasSettledListsOnce(true);
  }, [
    timelineQuery.isSuccess,
    timelineQuery.isError,
    growthQuery.isSuccess,
    growthQuery.isError,
    vaccinesQuery.isSuccess,
    vaccinesQuery.isError,
  ]);

  useEffect(() => {
    if (interval === false || !listsEnabled) return;
    let inFlight = false;
    let cancelled = false;
    const id = window.setInterval(() => {
      if (!babyTimelineSyncShouldFetch(inFlight)) return;
      inFlight = true;
      void (async () => {
        try {
          const first = await insightsFns.syncTimelineFirstPage();
          if (cancelled) return;
          await applyBabyTimelineSyncTruncate(
            queryClient,
            insightsFns.timelineQueryKey,
            first,
          );
          setAllowTimelineAutoFetch(false);
        } catch {
          /* keep pages; next tick retries */
        } finally {
          inFlight = false;
        }
      })();
    }, interval);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [interval, insightsFns, queryClient, listsEnabled]);

  useEffect(() => {
    if (!listsEnabled) return;
    const loadedPages = timelineQuery.data?.pages.length ?? 0;
    if (
      !timelineQuery.hasNextPage ||
      timelineQuery.isFetchingNextPage ||
      timelineQuery.isLoading ||
      !babyInsightsShouldAutoFetchNextPage(loadedPages, BABY_TIMELINE_MAX_PAGES, {
        allowAutoFetch: allowTimelineAutoFetch,
      })
    ) {
      return;
    }
    void timelineQuery.fetchNextPage();
  }, [
    listsEnabled,
    allowTimelineAutoFetch,
    timelineQuery.hasNextPage,
    timelineQuery.isFetchingNextPage,
    timelineQuery.isLoading,
    timelineQuery.data?.pages.length,
    timelineQuery.fetchNextPage,
  ]);

  const timelineItems = useMemo(
    () =>
      timelineQuery.data?.pages.flatMap((p) => p.babyTimeline.items) ?? [],
    [timelineQuery.data],
  );
  const growthEntries = useMemo(
    () =>
      growthQuery.data?.pages.flatMap((p) => p.babyGrowthEntries.items) ?? [],
    [growthQuery.data],
  );
  const vaccineEntries = useMemo(
    () =>
      vaccinesQuery.data?.pages.flatMap((p) => p.babyVaccines.items) ?? [],
    [vaccinesQuery.data],
  );

  const filteredTimeline = useMemo(
    () => filterTimelineByMergedChips(timelineItems, applied.chips),
    [timelineItems, applied.chips],
  );

  const filteredGrowth = useMemo(
    () => filterGrowthByMergedChips(growthEntries, applied.chips),
    [growthEntries, applied.chips],
  );

  const filteredVaccines = useMemo(
    () => filterVaccinesByMergedChips(vaccineEntries, applied.chips),
    [vaccineEntries, applied.chips],
  );

  const activityRows = useMemo(
    () =>
      mergeActivityLogRows(
        filteredTimeline.map((item) => ({
          id: item.id,
          kind: item.kind,
          type: item.type,
          at: item.at,
          endedAt: item.endedAt,
          summary: item.summary,
          payload: item.payload,
        })),
        filteredGrowth,
        filteredVaccines,
        {
          vaccineDoseLabel: (dose) => t(babyVaccineDoseLabelKey(dose)),
        },
      ),
    [filteredTimeline, filteredGrowth, filteredVaccines, t],
  );

  useEffect(() => {
    const loaded = activityLogStillVisibleSelectionKeys(activityRows);
    setSelectedKeys((prev) => {
      if (prev.size === 0) return prev;
      const next = pruneActivityLogSelectionToLoadedKeys(prev, loaded);
      if (next.size === prev.size && [...prev].every((k) => next.has(k))) {
        return prev;
      }
      return next;
    });
  }, [activityRows]);

  const activityListWindow = babyInsightsVisibleListRows(
    activityRows,
    activityListVisible,
  );

  const activityListsInitialLoading =
    (timelineQuery.isLoading ||
      growthQuery.isLoading ||
      vaccinesQuery.isLoading) &&
    activityRows.length === 0;

  const visibleSelectionKeys = useMemo(
    () =>
      activityListWindow.visible.map((row) =>
        activityLogSelectionKey(row.editTarget),
      ),
    [activityListWindow.visible],
  );
  const allVisibleSelected =
    visibleSelectionKeys.length > 0 &&
    visibleSelectionKeys.every((key) => selectedKeys.has(key));
  const someVisibleSelected =
    !allVisibleSelected &&
    visibleSelectionKeys.some((key) => selectedKeys.has(key));

  const toggleActivityRow = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setActionError(null);
  }, []);

  const toggleAllVisibleActivities = useCallback(() => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (
        visibleSelectionKeys.length > 0 &&
        visibleSelectionKeys.every((key) => next.has(key))
      ) {
        for (const key of visibleSelectionKeys) next.delete(key);
      } else {
        for (const key of visibleSelectionKeys) next.add(key);
      }
      return next;
    });
    setActionError(null);
  }, [visibleSelectionKeys]);

  const openActivityEdit = useCallback((row: ActivityLogRow) => {
    setEditRow(row);
  }, []);

  const handleSelectionBarEdit = useCallback(() => {
    if (!activitySelectionBarEditEnabled(selectedKeys.size)) return;
    const key = [...selectedKeys][0];
    if (!key) return;
    const row = activityRows.find(
      (r) => activityLogSelectionKey(r.editTarget) === key,
    );
    if (row) setEditRow(row);
  }, [activityRows, selectedKeys]);

  const handleSelectionBarDelete = useCallback(async () => {
    const count = selectedKeys.size;
    if (count === 0) return;
    const confirmMsg =
      count === 1
        ? t("insights.selectionDeleteConfirmOne")
        : fillTemplate(t("insights.selectionDeleteConfirmMany"), {
            n: String(count),
          });
    if (!window.confirm(confirmMsg)) return;

    setActionBusy(true);
    setActionError(null);
    const keys = [...selectedKeys];
    const targets = activityLogDeleteTargetsFromKeys(keys);
    const preDeleteVisible = activityLogStillVisibleSelectionKeys(activityRows);
    try {
      const results = await mapAllSettledWithConcurrency(
        targets,
        ACTIVITY_LOG_DELETE_CONCURRENCY,
        async (target) => {
          const kind = activityEditMutationFor(target, "delete");
          if (kind === "deleteBabyEvent") {
            await babyGraphQLRequest(DELETE_ACTIVITY_EVENT, { id: target.id });
          } else if (kind === "deleteBabyVaccine") {
            await babyGraphQLRequest(DELETE_ACTIVITY_VACCINE, {
              id: target.id,
            });
          } else {
            await babyGraphQLRequest(DELETE_ACTIVITY_GROWTH, { id: target.id });
          }
        },
      );
      const settled = targets.map((target, i) => ({
        key: activityLogSelectionKey(target),
        ok: results[i]?.status === "fulfilled",
      }));

      let stillVisible = preDeleteVisible;
      let invalidateFailed = false;
      try {
        await invalidateBabyQueries(
          queryClient,
          activityLogDeleteInvalidateScope(targets),
        );
        const timelineData = queryClient.getQueryData<BabyTimelineInfiniteData>(
          insightsFns.timelineQueryKey,
        );
        const growthData = queryClient.getQueryData<BabyGrowthInfiniteData>(
          insightsFns.growthQueryKey,
        );
        const vaccinesData = queryClient.getQueryData<BabyVaccinesInfiniteData>(
          insightsFns.vaccinesQueryKey,
        );
        const refreshedTimeline =
          timelineData?.pages.flatMap((p) => p.babyTimeline.items) ?? [];
        const refreshedGrowth =
          growthData?.pages.flatMap((p) => p.babyGrowthEntries.items) ?? [];
        const refreshedVaccines =
          vaccinesData?.pages.flatMap((p) => p.babyVaccines.items) ?? [];
        const refreshedRows = mergeActivityLogRows(
          filterTimelineByMergedChips(refreshedTimeline, applied.chips).map(
            (item) => ({
              id: item.id,
              kind: item.kind,
              type: item.type,
              at: item.at,
              endedAt: item.endedAt,
              summary: item.summary,
              payload: item.payload,
            }),
          ),
          filterGrowthByMergedChips(refreshedGrowth, applied.chips),
          filterVaccinesByMergedChips(refreshedVaccines, applied.chips),
          {
            vaccineDoseLabel: (dose) => t(babyVaccineDoseLabelKey(dose)),
          },
        );
        stillVisible = activityLogStillVisibleSelectionKeys(refreshedRows);
      } catch {
        invalidateFailed = true;
      }

      setSelectedKeys((prev) =>
        pruneActivityLogSelectionAfterDeletes(prev, settled, stillVisible),
      );

      if (invalidateFailed) {
        setActionError(t("insights.selectionDeleteAllFail"));
      } else {
        const alertMsg = activityLogDeleteSettleAlert(settled, {
          allFail: t("insights.selectionDeleteAllFail"),
          partialFail: t("insights.selectionDeletePartialFail"),
        });
        if (alertMsg) setActionError(alertMsg);
      }
    } catch {
      setActionError(t("insights.selectionDeleteAllFail"));
    } finally {
      setActionBusy(false);
    }
  }, [activityRows, applied.chips, insightsFns, queryClient, selectedKeys, t]);

  const selectionCountLabel =
    selectedKeys.size === 1
      ? t("insights.selectionCountOne")
      : fillTemplate(t("insights.selectionCountMany"), {
          n: String(selectedKeys.size),
        });

  const handleRetryLoad = useCallback(() => {
    void timelineQuery.refetch();
    void growthQuery.refetch();
    void vaccinesQuery.refetch();
  }, [timelineQuery, growthQuery, vaccinesQuery]);

  const hasMoreTimeline = Boolean(timelineQuery.hasNextPage);
  const hasMoreGrowth = Boolean(growthQuery.hasNextPage);
  const hasMoreVaccines = Boolean(vaccinesQuery.hasNextPage);
  const timelineSection = babyInsightsSectionState({
    isError: timelineQuery.isError,
    itemCount: filteredTimeline.length,
  });
  const growthSection = babyInsightsSectionState({
    isError: growthQuery.isError,
    itemCount: filteredGrowth.length,
  });
  const vaccinesSection = babyInsightsSectionState({
    isError: vaccinesQuery.isError,
    itemCount: filteredVaccines.length,
  });
  const listsLoadError =
    timelineSection === "error" ||
    growthSection === "error" ||
    vaccinesSection === "error";

  const showInitialSkeleton =
    !hasSettledListsOnce &&
    activityListsInitialLoading &&
    !timelineQuery.isError &&
    !growthQuery.isError &&
    !vaccinesQuery.isError;
  if (showInitialSkeleton) {
    return <BabyActivitiesPageSkeleton />;
  }

  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
      data-testid="baby-activities-page"
    >
      <div data-testid="baby-activities-filters">
        <InsightsDateRangeFiltersBar
          value={{ fromDate: draft.fromDate, toDate: draft.toDate }}
          onChange={(next) =>
            setDraft((d) => ({
              ...d,
              fromDate: next.fromDate,
              toDate: next.toDate,
            }))
          }
          onApply={handleApply}
          onReset={handleReset}
          applying={isFilterPending}
          dirty={dirty}
          labels={filterLabels}
          multiSelectFilters={[
            {
              id: "care",
              label: t("insights.filterCare"),
              legend: t("insights.filterCareLegend"),
              ariaLabel: t("insights.filterCareAria"),
              items: careFilterItems,
              value: mergeBabyInsightsFilterChips(draft.chips),
              onChange: (next) =>
                setDraft((d) => ({
                  ...d,
                  chips: splitBabyInsightsFilterChips(next),
                })),
              otherLabel: t("insights.filterCareOther"),
              emptyMessage: t("insights.filterCareEmpty"),
            },
          ]}
        />
      </div>

      <div data-testid="baby-activities-period">
        <AnalyticsPeriodChip
          fromDate={applied.fromDate}
          toDate={applied.toDate}
          activeFilters={activeChipLabels(applied.chips, t)}
          dirty={dirty}
          labels={periodLabels}
        />
      </div>

      <section
        className="space-y-3"
        data-testid="baby-activities-ledger"
      >
        {actionError ? (
          <Alert variant="error" title={actionError} />
        ) : null}
        {listsLoadError ? (
          <Alert
            variant="error"
            title={t("activities.loadError")}
            description={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleRetryLoad}
              >
                {t("activities.retry")}
              </Button>
            }
          />
        ) : activityListsInitialLoading ? (
          <div
            role="status"
            aria-busy="true"
            aria-live="polite"
            aria-label={t("common.loading")}
          >
            <BabyInsightsListSkeleton selectable />
          </div>
        ) : activityRows.length === 0 ? (
          <p className="text-sm text-muted">{t("activities.empty")}</p>
        ) : (
          <div className="@container w-full min-w-0">
            <div className="hidden min-w-0 @md:block">
              <Table>
                <TableCaption>{t("activities.title")}</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead freeze="leading" className="w-10">
                      <Checkbox
                        checked={allVisibleSelected}
                        indeterminate={someVisibleSelected}
                        onChange={toggleAllVisibleActivities}
                        disabled={actionBusy}
                        ariaLabel={t("insights.selectionSelectAll")}
                      />
                    </TableHead>
                    <TableHead freeze="afterCheckbox">
                      {t("insights.colEvent")}
                    </TableHead>
                    <TableHead>{t("insights.colRecorded")}</TableHead>
                    <TableHead>
                      <span className="sr-only">
                        {t("insights.selectionEdit")}
                      </span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityListWindow.visible.map((row) => {
                    const titleKey = activityLogRowTitleKey(row);
                    const title = titleKey ? t(titleKey) : row.title;
                    const summary = activityLogDisplaySummary(row, t);
                    const key = activityLogSelectionKey(row.editTarget);
                    const isSelected = selectedKeys.has(key);
                    const cue = babyActivityRegularCue(row, ageDays);
                    const cueLabel =
                      cue.border === "none"
                        ? undefined
                        : `${title}, ${cue.border} typical for age`;
                    return (
                      <TableRow
                        key={`${row.source}-${row.id}`}
                        selected={isSelected}
                        className="min-h-11"
                      >
                        <TableCell freeze="leading" className="w-10">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => toggleActivityRow(key)}
                            disabled={actionBusy}
                            ariaLabel={fillTemplate(
                              t("insights.selectionSelectRow"),
                              { title },
                            )}
                          />
                        </TableCell>
                        <TableCell
                          freeze="afterCheckbox"
                          className="font-medium"
                        >
                          <span className="inline-flex items-center gap-2">
                            <BabyActivityAccentBar
                              family={cue.family}
                              fillRatio={cue.fillRatio}
                            />
                            <BabyActivityTypeChip
                              family={cue.family}
                              border={cue.border}
                              cueLabel={cueLabel}
                            >
                              <span className="text-[10px] font-semibold uppercase text-[currentColor]">
                                {cue.family.slice(0, 1)}
                              </span>
                            </BabyActivityTypeChip>
                            <span>
                              {title}: {summary}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="text-muted">
                          <time dateTime={row.at}>
                            {new Date(row.at).toLocaleString()}
                          </time>
                        </TableCell>
                        <TableCell>
                          <TableRowActions>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={actionBusy}
                              onClick={() => openActivityEdit(row)}
                            >
                              {t("insights.selectionEdit")}
                            </Button>
                          </TableRowActions>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <ul className="fx-stagger-children space-y-2 @md:hidden">
              {activityListWindow.visible.map((row) => {
                const titleKey = activityLogRowTitleKey(row);
                const title = titleKey ? t(titleKey) : row.title;
                const summary = activityLogDisplaySummary(row, t);
                const key = activityLogSelectionKey(row.editTarget);
                const isSelected = selectedKeys.has(key);
                const cue = babyActivityRegularCue(row, ageDays);
                const cueLabel =
                  cue.border === "none"
                    ? undefined
                    : `${title}, ${cue.border} typical for age`;
                return (
                  <li key={`${row.source}-${row.id}`}>
                    <div
                      className={cn(
                        "flex min-h-12 items-start gap-3 rounded-[var(--radius-sm)] border border-border bg-surface px-4 py-3 transition-colors duration-150",
                        isSelected &&
                          "border-accent/40 bg-[color-mix(in_oklab,var(--accent)_8%,transparent)]",
                      )}
                    >
                      <div className="shrink-0 pt-0.5">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleActivityRow(key)}
                          disabled={actionBusy}
                          ariaLabel={fillTemplate(
                            t("insights.selectionSelectRow"),
                            { title },
                          )}
                        />
                      </div>
                      <BabyActivityAccentBar
                        family={cue.family}
                        fillRatio={cue.fillRatio}
                      />
                      <BabyActivityTypeChip
                        family={cue.family}
                        border={cue.border}
                        cueLabel={cueLabel}
                      >
                        <span className="text-[10px] font-semibold uppercase text-[currentColor]">
                          {cue.family.slice(0, 1)}
                        </span>
                      </BabyActivityTypeChip>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">
                          {title}: {summary}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          <time dateTime={row.at}>
                            {new Date(row.at).toLocaleString()}
                          </time>
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        disabled={actionBusy}
                        onClick={() => openActivityEdit(row)}
                      >
                        {t("insights.selectionEdit")}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {!listsLoadError && activityListWindow.hasMore ? (
          <Button
            type="button"
            size="lg"
            variant="secondary"
            onClick={() =>
              setActivityListVisible((n) =>
                babyInsightsNextListVisibleCount(n),
              )
            }
          >
            {t("insights.showMoreList")}
          </Button>
        ) : null}
        {!listsLoadError &&
        (hasMoreTimeline || hasMoreGrowth || hasMoreVaccines) ? (
          <Button
            type="button"
            size="lg"
            variant="secondary"
            disabled={
              loadMorePending ||
              growthLoadMorePending ||
              vaccinesLoadMorePending ||
              timelineQuery.isFetchingNextPage ||
              growthQuery.isFetchingNextPage ||
              vaccinesQuery.isFetchingNextPage
            }
            onClick={() => {
              if (hasMoreTimeline) {
                startLoadMore(() => {
                  void timelineQuery.fetchNextPage();
                });
              }
              if (hasMoreGrowth) {
                startGrowthLoadMore(() => {
                  void growthQuery.fetchNextPage();
                });
              }
              if (hasMoreVaccines) {
                startVaccinesLoadMore(() => {
                  void vaccinesQuery.fetchNextPage();
                });
              }
            }}
          >
            {t("timeline.loadMore")}
          </Button>
        ) : null}
      </section>

      <BabyActivitySelectionBar
        selectedCount={selectedKeys.size}
        busy={actionBusy}
        countLabel={selectionCountLabel}
        editLabel={t("insights.selectionEdit")}
        deleteLabel={t("insights.selectionDelete")}
        clearLabel={t("insights.selectionClear")}
        toolbarLabel={t("insights.selectionToolbar")}
        onEdit={handleSelectionBarEdit}
        onDelete={() => {
          void handleSelectionBarDelete();
        }}
        onClear={clearActivitySelection}
      />

      <BabyInsightsEditModal
        open={editRow != null}
        row={editRow}
        onClose={() => setEditRow(null)}
        onSaved={clearActivitySelection}
      />
    </div>
  );
}
