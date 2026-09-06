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
import { AboutDisclosure } from "@/components/ui/about-disclosure";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBabyLocale } from "@/components/baby-locale-provider";
import {
  BabyGrowthChartSkeleton,
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
  filterGrowthByKindChips,
  filterTimelineByCareChips,
  toggleBabyInsightsGrowthChip,
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
import {
  babyInsightsGrowthKindsDirty,
  babyInsightsShowChipApplyRow,
} from "@/lib/baby-insights-mobile-apply";
import { babyInsightsSectionState } from "@/lib/baby-insights-section-state";
import { deriveBabyInsightsKpis } from "@/lib/baby-insights-kpis";
import { aggregateCareCountsByDay, babyCareCountChartCopy } from "@/lib/baby-care-counts";
import {
  babyGrowthChartCopy,
  growthEntriesToSeries,
} from "@/lib/baby-growth-series";
import {
  babyTimelineDurationLabel,
  babyTimelineStopAtIso,
  babyTimelineSummaryLabel,
  formatBabyTimelineStopClock,
} from "@/lib/baby-timeline-row-display";
import {
  BABY_TIMELINE_MAX_PAGES,
  applyBabyTimelineSyncTruncate,
  babyGrowthNextPageParam,
  babyInsightsShouldAutoFetchNextPage,
  babySyncConfigQueryOptions,
  babyTimelineNextPageParam,
  babyTimelineSyncShouldFetch,
  buildBabyInsightsQueryFns,
} from "@/lib/baby-query-options";
import { babyRefetchInterval } from "@/lib/baby-sync-interval";
import { cn } from "@/lib/cn";
import {
  moneyQuickPickChipCls,
  moneyQuickPickGroupCls,
} from "@/lib/money-quick-pick-chip-cls";
import type { BabyMessageKey } from "@/messages/baby/en";
import { SHELL_DASHBOARD_STACK, SHELL_FULL_SPAN } from "@/lib/shell-layout";

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
  const { t, locale } = useBabyLocale();
  const queryClient = useQueryClient();
  const pageDefault = useMemo(() => defaultFilterState(), []);
  const [draft, setDraft] = useState(pageDefault);
  const [applied, setApplied] = useState(pageDefault);
  const [isFilterPending, startFilterTransition] = useTransition();
  const [loadMorePending, startLoadMore] = useTransition();
  const [growthLoadMorePending, startGrowthLoadMore] = useTransition();
  const [timelineListVisible, setTimelineListVisible] = useState(
    BABY_INSIGHTS_LIST_VISIBLE_CAP,
  );
  const [growthListVisible, setGrowthListVisible] = useState(
    BABY_INSIGHTS_LIST_VISIBLE_CAP,
  );
  const [visibility, setVisibility] =
    useState<DocumentVisibilityState>("visible");

  // Reset list DOM caps when the applied filter window changes.
  useEffect(() => {
    setTimelineListVisible(BABY_INSIGHTS_LIST_VISIBLE_CAP);
    setGrowthListVisible(BABY_INSIGHTS_LIST_VISIBLE_CAP);
  }, [applied.fromDate, applied.toDate, applied.chips]);

  const dirty = babyInsightsFiltersDirty(draft, applied);
  const growthKindsDirty = babyInsightsGrowthKindsDirty(
    draft.chips.growthKinds,
    applied.chips.growthKinds,
  );
  const showChipApply = babyInsightsShowChipApplyRow({ growthKindsDirty });
  const periodLabels = useMemo(() => babyInsightsPeriodChipLabels(t), [t]);
  const filterLabels = useMemo(
    () => babyInsightsDateRangeFilterLabels(t),
    [t],
  );
  const careFilterItems = useMemo(
    () =>
      BABY_INSIGHTS_CARE_CHIPS.map((chip) => ({
        id: chip,
        label: t(careChipLabelKey(chip)),
      })),
    [t],
  );

  const handleApply = useCallback(() => {
    startFilterTransition(() => {
      setApplied(draft);
    });
  }, [draft]);

  const handleReset = useCallback(() => {
    const fresh = defaultFilterState();
    setDraft(fresh);
    startFilterTransition(() => {
      setApplied(fresh);
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
  });

  const growthQuery = useInfiniteQuery({
    queryKey: insightsFns.growthQueryKey,
    queryFn: ({ pageParam }) =>
      insightsFns.growthQueryFn({ pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last, pages) => babyGrowthNextPageParam(last, pages),
  });

  useEffect(() => {
    if (interval === false) return;
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
  }, [interval, insightsFns, queryClient]);

  // Option A: auto-page the Insights window so care-count is less truncated.
  // Cap auto-fetch; manual Load more stays available while nextCursor remains.
  // After sync truncate, allowTimelineAutoFetch is false until bounds change.
  useEffect(() => {
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
    () => filterTimelineByCareChips(timelineItems, applied.chips.careTypes),
    [timelineItems, applied.chips.careTypes],
  );

  const filteredGrowth = useMemo(
    () => filterGrowthByKindChips(growthEntries, applied.chips.growthKinds),
    [growthEntries, applied.chips.growthKinds],
  );

  const kpis = useMemo(
    () =>
      deriveBabyInsightsKpis(
        { timeline: timelineItems, growth: growthEntries },
        applied.chips.careTypes,
      ),
    [timelineItems, growthEntries, applied.chips.careTypes],
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

  const careCountDays = useMemo(
    () => aggregateCareCountsByDay(timelineItems),
    [timelineItems],
  );

  function growthKindSelected(kind: BabyInsightsGrowthChip): boolean {
    return (
      applied.chips.growthKinds.length === 0 ||
      applied.chips.growthKinds.includes(kind)
    );
  }

  const showWeightChart = growthKindSelected("weight");
  const showHeightChart = growthKindSelected("height");
  const showHeadChart = growthKindSelected("head");
  const showTempChart = growthKindSelected("temperature");
  // Medication without numbers is skipped (no chart card).

  const loading = timelineQuery.isLoading || growthQuery.isLoading;
  if (loading) {
    return <BabyInsightsPageSkeleton />;
  }

  const animationKey = `${applied.fromDate}-${applied.toDate}-${applied.chips.careTypes.join(",")}`;
  const hasMoreTimeline = Boolean(timelineQuery.hasNextPage);
  const timelineIncomplete = Boolean(
    timelineQuery.data?.pages.at(-1)?.babyTimeline.nextCursor,
  );
  const careCountCopy = babyCareCountChartCopy({
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
      : t("insights.emptyGrowth");
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
  const growthListWindow = babyInsightsVisibleListRows(
    filteredGrowth,
    growthListVisible,
  );
  const timelineListWindow = babyInsightsVisibleListRows(
    filteredTimeline,
    timelineListVisible,
  );

  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
    >
      <AboutDisclosure label={t("insights.title")}>
        {t("insights.about")}
      </AboutDisclosure>

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
            value: draft.chips.careTypes,
            onChange: (next) =>
              setDraft((d) => ({
                ...d,
                chips: {
                  ...d.chips,
                  careTypes: next as BabyInsightsCareChip[],
                },
              })),
            otherLabel: t("insights.filterCareOther"),
            emptyMessage: t("insights.filterCareEmpty"),
          },
        ]}
      />

      {/* Growth kinds only — Feed/Sleep/Diaper live in Care filter (Money Accounts pattern). */}
      <section
        className="space-y-2"
        aria-label={t("insights.filterKinds")}
      >
        <div className={moneyQuickPickGroupCls} role="group">
          {BABY_INSIGHTS_GROWTH_CHIPS.map((chip) => {
            const active = draft.chips.growthKinds.includes(chip);
            return (
              <button
                key={chip}
                type="button"
                className={moneyQuickPickChipCls(active)}
                aria-pressed={active}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    chips: {
                      ...d.chips,
                      growthKinds: toggleBabyInsightsGrowthChip(
                        d.chips.growthKinds,
                        chip as BabyInsightsGrowthChip,
                      ),
                    },
                  }))
                }
              >
                {t(kindLabelKey(chip))}
              </button>
            );
          })}
        </div>
        {showChipApply ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isFilterPending}
              onClick={handleApply}
            >
              {isFilterPending ? t("insights.applying") : t("insights.apply")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isFilterPending}
              onClick={handleReset}
            >
              {t("insights.reset")}
            </Button>
          </div>
        ) : null}
      </section>

      <AnalyticsPeriodChip
        fromDate={applied.fromDate}
        toDate={applied.toDate}
        activeFilters={activeChipLabels(applied.chips, t)}
        dirty={dirty}
        labels={periodLabels}
      />

      <section
        className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3"
        aria-label="Summary metrics"
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

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-foreground">
            {t("insights.growthHeading")}
          </h2>
          <Link
            href="/baby/measure"
            className="text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            {t("insights.logMeasure")}
          </Link>
        </div>
        {growthSection === "error" ? (
          <p className="text-destructive">{t("insights.loadGrowthError")}</p>
        ) : (
          <>
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))",
              }}
              data-testid="baby-insights-charts"
            >
              {showWeightChart ? (
                <BabyGrowthChart
                  label={t("growth.weight")}
                  emptyLabel={growthEmptyLabel}
                  points={weightPoints}
                  ready={!growthQuery.isLoading}
                />
              ) : null}
              {showHeightChart ? (
                <BabyGrowthChart
                  label={t("growth.height")}
                  emptyLabel={growthEmptyLabel}
                  points={heightPoints}
                  ready={!growthQuery.isLoading}
                />
              ) : null}
              {showHeadChart ? (
                <BabyGrowthChart
                  label={t("growth.head")}
                  emptyLabel={growthEmptyLabel}
                  points={headPoints}
                  ready={!growthQuery.isLoading}
                />
              ) : null}
              {showTempChart ? (
                <BabyGrowthChart
                  label={t("growth.temperature")}
                  emptyLabel={growthEmptyLabel}
                  points={temperaturePoints}
                  ready={!growthQuery.isLoading}
                />
              ) : null}
              <BabyCareCountChart
                label={t("insights.careCountHeading")}
                emptyLabel={careCountEmptyLabel}
                partialNote={
                  (careCountCopy === "partial" ||
                    careCountCopy === "partialCapped") &&
                  careCountDays.length > 0
                    ? careCountPartialLabel
                    : null
                }
                days={careCountDays}
                ready={!timelineQuery.isLoading}
                seriesLabels={{
                  feed: t("insights.chipFeed"),
                  sleep: t("insights.chipSleep"),
                  diaper: t("insights.chipDiaper"),
                }}
              />
            </div>
            {growthPartialNote && filteredGrowth.length > 0 ? (
              <p className="text-xs text-muted">{growthPartialNote}</p>
            ) : null}
            {growthSection === "empty" ? (
              <p className="text-sm text-muted">{t("insights.emptyGrowth")}</p>
            ) : (
              <ul className="fx-stagger-children divide-y divide-border/80 border-y border-border/80">
                {growthListWindow.visible.map((entry) => (
                  <li key={entry.id} className="py-3">
                    <p className="font-medium text-foreground">
                      {t(kindLabelKey(entry.kind))}
                      {entry.valueNum != null
                        ? ` ${entry.valueNum}${entry.unit ? ` ${entry.unit}` : ""}`
                        : ""}
                    </p>
                    <p className="text-sm text-muted">
                      {new Date(entry.recordedAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {growthListWindow.hasMore ? (
              <Button
                type="button"
                size="lg"
                variant="secondary"
                onClick={() =>
                  setGrowthListVisible((n) =>
                    babyInsightsNextListVisibleCount(n),
                  )
                }
              >
                {t("insights.showMoreList")}
              </Button>
            ) : null}
            {hasMoreGrowth ? (
              <Button
                type="button"
                size="lg"
                variant="secondary"
                disabled={
                  growthLoadMorePending || growthQuery.isFetchingNextPage
                }
                onClick={() =>
                  startGrowthLoadMore(() => {
                    void growthQuery.fetchNextPage();
                  })
                }
              >
                {t("timeline.loadMore")}
              </Button>
            ) : null}
          </>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">
          {t("insights.timelineHeading")}
        </h2>
        {timelineSection === "error" ? (
          <p className="text-destructive">{t("timeline.loadError")}</p>
        ) : timelineSection === "empty" ? (
          <p className="text-sm text-muted">{t("insights.emptyTimeline")}</p>
        ) : (
          <ul className="fx-stagger-children divide-y divide-border/80 border-y border-border/80">
            {timelineListWindow.visible.map((item) => {
              const stopIso = babyTimelineStopAtIso(item);
              const duration = babyTimelineDurationLabel(item);
              return (
                <li key={`${item.kind}-${item.id}`} className="py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium text-foreground">
                      {babyTimelineSummaryLabel(item.summary)}
                    </p>
                    <div className="flex flex-wrap items-baseline gap-2 text-sm text-muted">
                      {duration ? (
                        <span className="tabular-nums">{duration}</span>
                      ) : null}
                      {stopIso ? (
                        <time dateTime={stopIso}>
                          {formatBabyTimelineStopClock(stopIso, locale)}
                        </time>
                      ) : null}
                    </div>
                  </div>
                  {item.source === "telegram" ? (
                    <p className="mt-1 text-sm text-muted">
                      {t("timeline.sourceTelegram").replace(/^ · /, "")}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {timelineListWindow.hasMore ? (
          <Button
            type="button"
            size="lg"
            variant="secondary"
            onClick={() =>
              setTimelineListVisible((n) => babyInsightsNextListVisibleCount(n))
            }
          >
            {t("insights.showMoreList")}
          </Button>
        ) : null}
        {hasMoreTimeline ? (
          <Button
            type="button"
            size="lg"
            variant="secondary"
            disabled={loadMorePending || timelineQuery.isFetchingNextPage}
            onClick={() =>
              startLoadMore(() => {
                void timelineQuery.fetchNextPage();
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
