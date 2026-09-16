"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { AnalyticsPeriodChip } from "@/components/analytics-period-chip";
import { Alert } from "@/components/ui/alert";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { useBabyLocale } from "@/components/baby-locale-provider";
import {
  BabyGrowthChartSkeleton,
  BabyInsightsListSkeleton,
  BabyInsightsPageSkeleton,
} from "@/components/baby-page-skeleton";
import {
  MoneyAnalyticsFiltersBarSkeleton,
} from "@/components/money-analytics-skeleton";
import {
  BABY_INSIGHTS_CARE_CHIPS,
  BABY_INSIGHTS_GROWTH_CHIPS,
  babyInsightsFiltersDirty,
  emptyBabyInsightsChips,
  filterGrowthByMergedChips,
  filterTimelineByMergedChips,
  growthKindVisibleInMergedChips,
  mergeBabyInsightsFilterChips,
  splitBabyInsightsFilterChips,
  type BabyInsightsCareChip,
  type BabyInsightsChipSelection,
  type BabyInsightsFilterState,
  type BabyInsightsGrowthChip,
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
import { preferSeriesInsightCountKpis } from "@/lib/baby-insights-kpis";
import {
  filterCareCountDaysByCareChips,
  filterHydrationDaysByCareChips,
  filterNightRestDaysByCareChips,
  seriesChartVisibleForCareChips,
} from "@/lib/baby-insights-series-chips";
import {
  ACTIVITY_LOG_DELETE_CONCURRENCY,
  activityLogDeleteInvalidateScope,
  activityLogDeleteSettleAlert,
  activityLogDeleteTargetsFromKeys,
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
import { babyGraphQLRequest } from "@/lib/baby-gql-client";
import {
  aggregateCareCountsByDay,
  babyCareCountChartCopy,
  babyCareCountChartCopyFromSeries,
} from "@/lib/baby-care-counts";
import {
  babyGrowthChartCopy,
  growthEntriesToSeries,
} from "@/lib/baby-growth-series";
import {
  BABY_TIMELINE_MAX_PAGES,
  applyBabyTimelineSyncTruncate,
  babyGrowthNextPageParam,
  babyInsightsShouldAutoFetchNextPage,
  babySyncConfigQueryOptions,
  babyTimelineNextPageParam,
  babyTimelineSyncShouldFetch,
  buildBabyInsightsQueryFns,
  invalidateBabyQueries,
  type BabyGrowthInfiniteData,
  type BabyTimelineInfiniteData,
} from "@/lib/baby-query-options";
import { babyRefetchInterval } from "@/lib/baby-sync-interval";
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

const BabyGrowthChart = dynamic(
  () =>
    import("@/components/baby-growth-chart").then((m) => ({
      default: m.BabyGrowthChart,
    })),
  { ssr: false, loading: () => <BabyGrowthChartSkeleton /> },
);

const BabyCareCountChart = dynamic(
  () =>
    import("@/components/baby-care-count-chart").then((m) => ({
      default: m.BabyCareCountChart,
    })),
  { ssr: false, loading: () => <BabyGrowthChartSkeleton /> },
);

const BabyHydrationChart = dynamic(
  () =>
    import("@/components/baby-hydration-chart").then((m) => ({
      default: m.BabyHydrationChart,
    })),
  { ssr: false, loading: () => <BabyGrowthChartSkeleton /> },
);

const BabyNightRestChart = dynamic(
  () =>
    import("@/components/baby-night-rest-chart").then((m) => ({
      default: m.BabyNightRestChart,
    })),
  { ssr: false, loading: () => <BabyGrowthChartSkeleton /> },
);

const BabyPatternFinderChart = dynamic(
  () =>
    import("@/components/baby-pattern-finder-chart").then((m) => ({
      default: m.BabyPatternFinderChart,
    })),
  { ssr: false, loading: () => <BabyGrowthChartSkeleton /> },
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

export function BabyInsightsDashboard() {
  const { t } = useBabyLocale();
  const queryClient = useQueryClient();
  const pageDefault = useMemo(() => defaultFilterState(), []);
  const [draft, setDraft] = useState(pageDefault);
  const [applied, setApplied] = useState(pageDefault);
  const [isFilterPending, startFilterTransition] = useTransition();
  const [loadMorePending, startLoadMore] = useTransition();
  const [growthLoadMorePending, startGrowthLoadMore] = useTransition();
  const [activityListVisible, setActivityListVisible] = useState(
    BABY_INSIGHTS_LIST_VISIBLE_CAP,
  );
  const [moreOpen, setMoreOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  /** After first series settle, keep filter chrome mounted on range changes (Loans pattern). */
  const [hasSettledSeriesOnce, setHasSettledSeriesOnce] = useState(false);
  const [editRow, setEditRow] = useState<ActivityLogRow | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [visibility, setVisibility] =
    useState<DocumentVisibilityState>("visible");

  // Reset list DOM caps when the applied filter window changes.
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
  const minutes = syncQuery.data ?? 1;
  const interval = babyRefetchInterval(minutes, visibility);

  const insightsFns = useMemo(
    () => buildBabyInsightsQueryFns(bounds),
    [bounds],
  );

  // Timeline + growth payload lists only after Activity log expand.
  // More insights binds series KPIs / charts only — no growth waterfall.
  const timelineEnabled = activityOpen;
  const growthEnabled = activityOpen;
  const listsEnabled = timelineEnabled;

  // Auto-page only on initial load / filter (bounds) change — not after sync
  // truncate, which would re-walk pages 2…N every minute.
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
    enabled: timelineEnabled,
  });

  const growthQuery = useInfiniteQuery({
    queryKey: insightsFns.growthQueryKey,
    queryFn: ({ pageParam }) =>
      insightsFns.growthQueryFn({ pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last, pages) => babyGrowthNextPageParam(last, pages),
    enabled: growthEnabled,
  });

  const seriesQuery = useQuery({
    queryKey: insightsFns.seriesQueryKey,
    queryFn: insightsFns.seriesQueryFn,
  });

  useEffect(() => {
    if (seriesQuery.isSuccess || seriesQuery.isError) {
      setHasSettledSeriesOnce(true);
    }
  }, [seriesQuery.isSuccess, seriesQuery.isError]);

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
          // Cancel in-flight fetchNextPage before truncate so a late append
          // cannot restore stale multi-page cache over the fresh first page.
          await applyBabyTimelineSyncTruncate(
            queryClient,
            insightsFns.timelineQueryKey,
            first,
          );
          // Do not auto-refill pages after sync — Load more / partial note.
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

  // Option A: auto-page the Insights window so care-count is less truncated.
  // Cap auto-fetch; manual Load more stays available while nextCursor remains.
  // After sync truncate, allowTimelineAutoFetch is false until bounds change.
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

  const filteredTimeline = useMemo(
    () => filterTimelineByMergedChips(timelineItems, applied.chips),
    [timelineItems, applied.chips],
  );

  const filteredGrowth = useMemo(
    () => filterGrowthByMergedChips(growthEntries, applied.chips),
    [growthEntries, applied.chips],
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
      ),
    [filteredTimeline, filteredGrowth],
  );

  // Sync truncate (and any other load shrink) must not leave orphan selection keys.
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
    (timelineQuery.isLoading || growthQuery.isLoading) &&
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
      // Cap parallel deletes vs Baby GraphQL RPM (default 60). Select-all /
      // retention can exceed 100 keys — uncapped allSettled would 429.
      const results = await mapAllSettledWithConcurrency(
        targets,
        ACTIVITY_LOG_DELETE_CONCURRENCY,
        async (target) => {
          const kind = activityEditMutationFor(target, "delete");
          if (kind === "deleteBabyEvent") {
            await babyGraphQLRequest(DELETE_ACTIVITY_EVENT, { id: target.id });
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
        // Post-invalidate cache — not the pre-delete render snapshot — so failed
        // keys whose rows left the list are pruned (design: keep only if still present).
        const timelineData = queryClient.getQueryData<BabyTimelineInfiniteData>(
          insightsFns.timelineQueryKey,
        );
        const growthData = queryClient.getQueryData<BabyGrowthInfiniteData>(
          insightsFns.growthQueryKey,
        );
        const refreshedTimeline =
          timelineData?.pages.flatMap((p) => p.babyTimeline.items) ?? [];
        const refreshedGrowth =
          growthData?.pages.flatMap((p) => p.babyGrowthEntries.items) ?? [];
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
        );
        stillVisible = activityLogStillVisibleSelectionKeys(refreshedRows);
      } catch {
        // Settle succeeded but invalidate threw — still prune from settle +
        // pre-refresh rows so selection does not disagree with mutations.
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

  const series = seriesQuery.data?.babyInsightsSeries;
  const careTypes = applied.chips.careTypes;

  const hydrationDays = useMemo(
    () =>
      filterHydrationDaysByCareChips(
        series?.hydration.days ?? [],
        careTypes,
      ),
    [series?.hydration.days, careTypes],
  );
  const nightRestDays = useMemo(
    () =>
      filterNightRestDaysByCareChips(
        series?.nightRest.days ?? [],
        careTypes,
      ),
    [series?.nightRest.days, careTypes],
  );
  const hydrationReady =
    !seriesQuery.isLoading &&
    !series?.hydration.emptyReason &&
    seriesChartVisibleForCareChips(careTypes, ["feed", "diaper"]);
  const nightRestReady =
    !seriesQuery.isLoading &&
    !series?.nightRest.emptyReason &&
    seriesChartVisibleForCareChips(careTypes, ["sleep"]);

  const kpis = useMemo(
    () =>
      preferSeriesInsightCountKpis({
        seriesCounts: series?.counts,
        careTypes,
        growth: growthEntries,
        timelineFallback: timelineItems,
      }),
    [series?.counts, growthEntries, timelineItems, careTypes],
  );

  const weightPoints = useMemo(
    () =>
      growthEntriesToSeries(
        filteredGrowth
          .filter((e) => e.kind === "weight")
          .map((e) => ({
            recordedAt: new Date(e.recordedAt),
            valueNum: e.valueNum != null ? String(e.valueNum) : null,
          })),
      ),
    [filteredGrowth],
  );

  const heightPoints = useMemo(
    () =>
      growthEntriesToSeries(
        filteredGrowth
          .filter((e) => e.kind === "height")
          .map((e) => ({
            recordedAt: new Date(e.recordedAt),
            valueNum: e.valueNum != null ? String(e.valueNum) : null,
          })),
      ),
    [filteredGrowth],
  );

  const headPoints = useMemo(
    () =>
      growthEntriesToSeries(
        filteredGrowth
          .filter((e) => e.kind === "head")
          .map((e) => ({
            recordedAt: new Date(e.recordedAt),
            valueNum: e.valueNum != null ? String(e.valueNum) : null,
          })),
      ),
    [filteredGrowth],
  );

  const temperaturePoints = useMemo(
    () =>
      growthEntriesToSeries(
        filteredGrowth
          .filter((e) => e.kind === "temperature")
          .map((e) => ({
            recordedAt: new Date(e.recordedAt),
            valueNum: e.valueNum != null ? String(e.valueNum) : null,
          })),
      ),
    [filteredGrowth],
  );

  // Prefer series full-range days; fall back to capped timeline only when
  // Activity log lists are loaded and series is missing.
  const careCountDays = useMemo(() => {
    const raw = series?.careCountDays
      ? series.careCountDays
      : listsEnabled
        ? aggregateCareCountsByDay(timelineItems)
        : [];
    return filterCareCountDaysByCareChips(raw, careTypes);
  }, [series?.careCountDays, listsEnabled, timelineItems, careTypes]);

  function growthKindSelected(kind: BabyInsightsGrowthChip): boolean {
    return growthKindVisibleInMergedChips(kind, applied.chips);
  }

  const showWeightChart = growthKindSelected("weight");
  const showHeightChart = growthKindSelected("height");
  const showHeadChart = growthKindSelected("head");
  const showTempChart = growthKindSelected("temperature");
  // Medication without numbers is skipped (no chart card).

  // Full-page skeleton only before the first series response. After that, keep
  // filters/period mounted on Apply so range changes update charts in place
  // (same pattern as Loans / Money Insights — not a blank page swap).
  const showInitialSkeleton =
    !hasSettledSeriesOnce &&
    seriesQuery.isLoading &&
    !seriesQuery.data &&
    !seriesQuery.isError;
  if (showInitialSkeleton) {
    return <BabyInsightsPageSkeleton />;
  }

  const animationKey = `${applied.fromDate}-${applied.toDate}-${applied.chips.careTypes.join(",")}`;
  const hasMoreTimeline = Boolean(timelineQuery.hasNextPage);
  const timelineIncomplete = Boolean(
    timelineQuery.data?.pages.at(-1)?.babyTimeline.nextCursor,
  );
  const careCountFromSeries = Boolean(series?.careCountDays);
  const careCountCopy = careCountFromSeries
    ? babyCareCountChartCopyFromSeries(careCountDays.length)
    : babyCareCountChartCopy({
        dayCount: careCountDays.length,
        timelineIncomplete,
        canLoadMore: hasMoreTimeline,
      });
  const careCountPartialLabel =
    careCountCopy === "partialCapped"
      ? t("insights.partialCareCountCapped")
      : t("insights.partialCareCount");
  const careCountEmptyLabel =
    careCountCopy === "partial" || careCountCopy === "partialCapped"
      ? careCountPartialLabel
      : t("insights.emptyCareCount");
  const hasMoreGrowth = Boolean(growthQuery.hasNextPage);
  const growthIncomplete = Boolean(
    growthQuery.data?.pages.at(-1)?.babyGrowthEntries.nextCursor,
  );
  const growthCopy = babyGrowthChartCopy({
    pointCount: filteredGrowth.length,
    growthIncomplete,
    canLoadMore: hasMoreGrowth,
  });
  const growthPartialLabel =
    growthCopy === "partialCapped"
      ? t("insights.partialGrowthCapped")
      : t("insights.partialGrowth");
  const growthEmptyLabel =
    growthCopy === "partial" || growthCopy === "partialCapped"
      ? growthPartialLabel
      : t("insights.emptyGrowthChart");
  const growthPartialNote =
    growthCopy === "partial" || growthCopy === "partialCapped"
      ? growthPartialLabel
      : null;
  const growthSection = babyInsightsSectionState({
    isError: growthQuery.isError,
    itemCount: filteredGrowth.length,
  });
  const timelineSection = babyInsightsSectionState({
    isError: timelineQuery.isError,
    itemCount: filteredTimeline.length,
  });

  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
    >
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

      <AnalyticsPeriodChip
        fromDate={applied.fromDate}
        toDate={applied.toDate}
        activeFilters={activeChipLabels(applied.chips, t)}
        dirty={dirty}
        labels={periodLabels}
      />


      {seriesQuery.isError ? (
        <p className="text-destructive">{t("insights.loadSeriesError")}</p>
      ) : null}

      <section
        className="grid gap-4"
        style={{
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))",
        }}
        data-testid="baby-insights-default-charts"
        aria-label={t("insights.hydrationTitle")}
      >
        <BabyHydrationChart
          label={t("insights.hydrationTitle")}
          purpose={t("insights.hydrationPurpose")}
          emptyLabel={t("insights.hydrationEmpty")}
          wetLegendLabel={t("insights.hydrationWetLegend")}
          feedsLegendLabel={t("insights.hydrationFeedsLegend")}
          days={hydrationDays}
          ready={hydrationReady}
        />
        <BabyNightRestChart
          label={t("insights.nightRestTitle")}
          purpose={t("insights.nightRestPurpose")}
          emptyLabel={t("insights.nightRestEmpty")}
          blocksLabel={t("insights.nightRestBlocks")}
          days={nightRestDays}
          ready={nightRestReady}
        />
      </section>

      {series?.hydration.alert === "low_wet" &&
      seriesChartVisibleForCareChips(careTypes, ["feed", "diaper"]) ? (
        <Alert
          variant="warning"
          title={t("insights.hydrationAlert")}
        />
      ) : null}

      <section className="space-y-3">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          aria-expanded={moreOpen}
          data-testid="baby-more-insights"
          onClick={() => setMoreOpen((o) => !o)}
        >
          {t("insights.moreInsights")}
        </Button>
        {moreOpen ? (
          <div className="space-y-4" data-testid="baby-more-insights-panel">
            <section
              className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3"
              aria-label="Insight metrics"
            >
              <Card className="px-4 py-4">
                <p className="text-sm font-medium text-muted">
                  {t("insights.kpiWakeWindow")}
                </p>
                <p className="mt-2 text-lg font-semibold tabular-nums">
                  {seriesChartVisibleForCareChips(careTypes, ["sleep"]) &&
                  series?.wakeWindow.avgMinutes != null
                    ? `${Math.round(series.wakeWindow.avgMinutes)}m`
                    : series?.wakeWindow.emptyReason === "need_3_days"
                      ? t("insights.kpiNeed3Days")
                      : t("insights.kpiNeedMoreSleep")}
                </p>
              </Card>
              <Card className="px-4 py-4">
                <p className="text-sm font-medium text-muted">
                  {t("insights.kpiMilkDiaper")}
                </p>
                <p className="mt-2 text-lg font-semibold tabular-nums">
                  {seriesChartVisibleForCareChips(careTypes, [
                    "feed",
                    "diaper",
                  ]) && series?.milkToDiaper.avgLagMinutes != null
                    ? `${Math.round(series.milkToDiaper.avgLagMinutes)}m`
                    : t("insights.kpiNeedMoreLogs")}
                </p>
              </Card>
              <Card className="px-4 py-4">
                <p className="text-sm font-medium text-muted">
                  {t("insights.kpiSleepEfficiency")}
                </p>
                <p className="mt-2 text-sm text-muted">
                  {t("insights.kpiNeedWakings")}
                </p>
              </Card>
            </section>

            <section
              className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3"
              aria-label="Summary metrics"
              data-testid="baby-count-kpis"
            >
              <Card className="px-4 py-4">
                <p className="text-sm font-medium text-muted">
                  {t("insights.kpiFeeds")}
                </p>
                <p className="mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                  <AnimatedNumber
                    value={kpis.feeds}
                    format={(n) => String(Math.round(n))}
                    animationKey={animationKey}
                  />
                </p>
              </Card>
              <Card className="px-4 py-4">
                <p className="text-sm font-medium text-muted">
                  {t("insights.kpiSleep")}
                </p>
                <p className="mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                  <AnimatedNumber
                    value={kpis.sleep}
                    format={(n) => String(Math.round(n))}
                    animationKey={animationKey}
                  />
                </p>
              </Card>
              <Card className="px-4 py-4">
                <p className="text-sm font-medium text-muted">
                  {t("insights.kpiDiapers")}
                </p>
                <p className="mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                  <AnimatedNumber
                    value={kpis.diapers}
                    format={(n) => String(Math.round(n))}
                    animationKey={animationKey}
                  />
                </p>
              </Card>
              <Card className="px-4 py-4">
                <p className="text-sm font-medium text-muted">
                  {t("insights.kpiLatestWeight")}
                </p>
                <p className="mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                  {kpis.latestWeight ? (
                    <>
                      <AnimatedNumber
                        value={kpis.latestWeight.valueNum}
                        format={(n) => n.toFixed(1)}
                        animationKey={animationKey}
                      />
                      {kpis.latestWeight.unit ? (
                        <span className="ms-1 text-base font-medium text-muted">
                          {kpis.latestWeight.unit}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </p>
              </Card>
            </section>

            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 28rem), 1fr))",
              }}
              data-testid="baby-insights-charts"
            >
              {/* Useful-first: routine → nap schedule → care volume → growth → stool mix */}
              <BabyPatternFinderChart
                label={t("insights.patternTitle")}
                purpose={t("insights.patternPurpose")}
                emptyLabel={t("insights.patternEmpty")}
                days={series?.patternFinder.days ?? []}
                ready={
                  !seriesQuery.isLoading &&
                  !series?.patternFinder.emptyReason &&
                  seriesChartVisibleForCareChips(careTypes, [
                    "feed",
                    "sleep",
                    "diaper",
                  ])
                }
              />
              <Card
                className="p-4"
                data-testid="baby-awake-trend-chart"
              >
                <p className="mb-1 text-sm font-medium">
                  {t("insights.awakeTrendTitle")}
                </p>
                <p className="mb-2 text-xs text-muted">
                  {t("insights.awakeTrendPurpose")}
                </p>
                {!seriesChartVisibleForCareChips(careTypes, ["sleep"]) ||
                series?.awakeTrend.emptyReason ||
                !(series?.awakeTrend.days?.length) ? (
                  <p className="text-sm text-muted">
                    {t("insights.awakeTrendEmpty")}
                  </p>
                ) : (
                  <ul className="space-y-1 text-sm tabular-nums">
                    {series.awakeTrend.days!.map((d) => (
                      <li key={d.date}>
                        {d.date}: {Math.round(d.meanWakeMinutes)}m
                        {d.rollingMeanWakeMinutes != null
                          ? ` (roll ${Math.round(d.rollingMeanWakeMinutes)}m)`
                          : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <BabyCareCountChart
                label={t("insights.careCountHeading")}
                emptyLabel={careCountEmptyLabel}
                partialNote={
                  !careCountFromSeries &&
                  (careCountCopy === "partial" ||
                    careCountCopy === "partialCapped") &&
                  careCountDays.length > 0
                    ? careCountPartialLabel
                    : null
                }
                days={careCountDays}
                ready={
                  careCountFromSeries
                    ? !seriesQuery.isLoading
                    : listsEnabled && !timelineQuery.isLoading
                }
                seriesLabels={{
                  feed: t("insights.chipFeed"),
                  sleep: t("insights.chipSleep"),
                  diaper: t("insights.chipDiaper"),
                }}
              />
              {showWeightChart ? (
                <BabyGrowthChart
                  label={t("growth.weight")}
                  emptyLabel={growthEmptyLabel}
                  points={weightPoints}
                  ready={
                    growthEnabled ? !growthQuery.isLoading : true
                  }
                />
              ) : null}
              {showHeightChart ? (
                <BabyGrowthChart
                  label={t("growth.height")}
                  emptyLabel={growthEmptyLabel}
                  points={heightPoints}
                  ready={
                    growthEnabled ? !growthQuery.isLoading : true
                  }
                />
              ) : null}
              {showHeadChart ? (
                <BabyGrowthChart
                  label={t("growth.head")}
                  emptyLabel={growthEmptyLabel}
                  points={headPoints}
                  ready={
                    growthEnabled ? !growthQuery.isLoading : true
                  }
                />
              ) : null}
              {showTempChart ? (
                <BabyGrowthChart
                  label={t("growth.temperature")}
                  emptyLabel={growthEmptyLabel}
                  points={temperaturePoints}
                  ready={
                    growthEnabled ? !growthQuery.isLoading : true
                  }
                />
              ) : null}
              <Card
                className="p-4"
                data-testid="baby-diaper-output-chart"
              >
                <p className="mb-1 text-sm font-medium">
                  {t("insights.diaperOutputTitle")}
                </p>
                <p className="mb-2 text-xs text-muted">
                  {t("insights.diaperOutputPurpose")}
                </p>
                {seriesChartVisibleForCareChips(careTypes, ["diaper"]) &&
                !series?.diaperOutput.emptyReason &&
                series?.diaperOutput.buckets ? (
                  <ul className="space-y-1 text-sm tabular-nums">
                    <li>
                      {t("insights.diaperBucketWet")}:{" "}
                      {series.diaperOutput.buckets.wet}
                    </li>
                    <li>
                      {t("insights.diaperBucketNormal")}:{" "}
                      {series.diaperOutput.buckets.normal}
                    </li>
                    <li>
                      {t("insights.diaperBucketWatery")}:{" "}
                      {series.diaperOutput.buckets.watery}
                    </li>
                    <li>
                      {t("insights.diaperBucketBlowouts")}:{" "}
                      {series.diaperOutput.buckets.blowouts}
                    </li>
                  </ul>
                ) : (
                  <p className="text-sm text-muted">
                    {t("insights.diaperOutputEmpty")}
                  </p>
                )}
              </Card>
              {series?.diaperOutput.alert === "high_watery" &&
              seriesChartVisibleForCareChips(careTypes, ["diaper"]) ? (
                <Alert
                  variant="warning"
                  title={t("insights.diaperWateryAlert")}
                />
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/baby/measure"
                className="text-sm font-medium text-accent underline-offset-4 hover:underline"
              >
                {t("insights.logMeasure")}
              </Link>
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          aria-expanded={activityOpen}
          data-testid="baby-activity-log"
          onClick={() => {
            setActivityOpen((o) => {
              const next = !o;
              if (!next) {
                setSelectedKeys(new Set());
                setActionError(null);
              }
              return next;
            });
          }}
        >
          {t("insights.activityLog")}
        </Button>
        {activityOpen ? (
          <div className="space-y-3" data-testid="baby-activity-log-panel">
            {actionError ? (
              <Alert variant="error" title={actionError} />
            ) : null}
            {timelineSection === "error" || growthSection === "error" ? (
              <p className="text-destructive">{t("timeline.loadError")}</p>
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
              <p className="text-sm text-muted">
                {t("insights.activityLogEmpty")}
              </p>
            ) : (
              <div className="@container w-full min-w-0">
                <div className="hidden min-w-0 @md:block">
                  <Table>
                    <TableCaption>{t("insights.activityLog")}</TableCaption>
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
                        const key = activityLogSelectionKey(row.editTarget);
                        const isSelected = selectedKeys.has(key);
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
                              {title}: {row.summary}
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
                    const key = activityLogSelectionKey(row.editTarget);
                    const isSelected = selectedKeys.has(key);
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
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground">
                              {title}: {row.summary}
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
            {activityListWindow.hasMore ? (
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
            {hasMoreTimeline || hasMoreGrowth ? (
              <Button
                type="button"
                size="lg"
                variant="secondary"
                disabled={
                  loadMorePending ||
                  growthLoadMorePending ||
                  timelineQuery.isFetchingNextPage ||
                  growthQuery.isFetchingNextPage
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
                }}
              >
                {t("timeline.loadMore")}
              </Button>
            ) : null}
          </div>
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
