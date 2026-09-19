"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { AnalyticsPeriodChip } from "@/components/analytics-period-chip";
import { Alert } from "@/components/ui/alert";
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
  babyInsightsFiltersDirty,
  emptyBabyInsightsChips,
  filterGrowthByMergedChips,
  growthKindVisibleInMergedChips,
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
  babyInsightsDateRangeFilterLabels,
  babyInsightsPeriodChipLabels,
} from "@/lib/baby-insights-chrome-labels";
import { preferSeriesInsightCountKpis } from "@/lib/baby-insights-kpis";
import { babyInsightsGrowthEnabled } from "@/lib/baby-activities-enable";
import {
  filterCareCountDaysByCareChips,
  filterHydrationDaysByCareChips,
  filterNightRestDaysByCareChips,
  seriesChartVisibleForCareChips,
} from "@/lib/baby-insights-series-chips";
import {
  babyGrowthChartCopy,
  growthEntriesToSeries,
} from "@/lib/baby-growth-series";
import {
  BABY_GROWTH_MAX_PAGES,
  babyGrowthNextPageParam,
  babyInsightsShouldAutoFetchNextPage,
  buildBabyInsightsQueryFns,
} from "@/lib/baby-query-options";
import { cn } from "@/lib/cn";
import type { BabyMessageKey } from "@/messages/baby/en";
import { SHELL_DASHBOARD_STACK, SHELL_FULL_SPAN } from "@/lib/shell-layout";

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

const InsightsDateRangeFiltersBar = dynamic(
  () =>
    import("@/components/analytics-filters").then((m) => ({
      default: m.InsightsDateRangeFiltersBar,
    })),
  {
    loading: () => <MoneyAnalyticsFiltersBarSkeleton triggerCount={1} />,
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

export function BabyInsightsDashboard() {
  const { t } = useBabyLocale();
  const pageDefault = useMemo(() => defaultFilterState(), []);
  const [draft, setDraft] = useState(pageDefault);
  const [applied, setApplied] = useState(pageDefault);
  const [isFilterPending, startFilterTransition] = useTransition();
  const [moreOpen, setMoreOpen] = useState(false);
  /** After first series settle, keep filter chrome mounted on range changes (Loans pattern). */
  const [hasSettledSeriesOnce, setHasSettledSeriesOnce] = useState(false);

  const dirty = babyInsightsFiltersDirty(draft, applied);
  const periodLabels = useMemo(() => babyInsightsPeriodChipLabels(t), [t]);
  const filterLabels = useMemo(
    () => babyInsightsDateRangeFilterLabels(t),
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

  const insightsFns = useMemo(
    () => buildBabyInsightsQueryFns(bounds),
    [bounds],
  );

  // Timeline list lives on Activities. Growth lists follow More insights expand.
  const growthEnabled = babyInsightsGrowthEnabled({ moreOpen });

  const growthQuery = useInfiniteQuery({
    queryKey: insightsFns.growthQueryKey,
    queryFn: ({ pageParam }) =>
      insightsFns.growthQueryFn({ pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last, pages) => babyGrowthNextPageParam(last, pages),
    enabled: growthEnabled,
  });

  const [growthLoadMorePending, startGrowthLoadMore] = useTransition();

  const seriesQuery = useQuery({
    queryKey: insightsFns.seriesQueryKey,
    queryFn: insightsFns.seriesQueryFn,
  });

  useEffect(() => {
    if (seriesQuery.isSuccess || seriesQuery.isError) {
      setHasSettledSeriesOnce(true);
    }
  }, [seriesQuery.isSuccess, seriesQuery.isError]);

  // Decision 2 Option 2: when More insights opens, auto-page growth so charts
  // are not stuck on page 1 (load-more button covers pages past the auto cap).
  useEffect(() => {
    if (!growthEnabled) return;
    const loadedPages = growthQuery.data?.pages.length ?? 0;
    if (
      !growthQuery.hasNextPage ||
      growthQuery.isFetchingNextPage ||
      growthQuery.isLoading ||
      !babyInsightsShouldAutoFetchNextPage(loadedPages, BABY_GROWTH_MAX_PAGES)
    ) {
      return;
    }
    void growthQuery.fetchNextPage();
  }, [
    growthEnabled,
    growthQuery.hasNextPage,
    growthQuery.isFetchingNextPage,
    growthQuery.isLoading,
    growthQuery.data?.pages.length,
    growthQuery.fetchNextPage,
  ]);

  const growthEntries = useMemo(
    () =>
      growthQuery.data?.pages.flatMap((p) => p.babyGrowthEntries.items) ?? [],
    [growthQuery.data],
  );

  const filteredGrowth = useMemo(
    () => filterGrowthByMergedChips(growthEntries, applied.chips),
    [growthEntries, applied.chips],
  );

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
      }),
    [series?.counts, growthEntries, careTypes],
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

  // Series-only care counts after timeline list left Insights.
  const careCountDays = useMemo(() => {
    const raw = series?.careCountDays ?? [];
    return filterCareCountDaysByCareChips(raw, careTypes);
  }, [series?.careCountDays, careTypes]);

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
  const careCountFromSeries = Boolean(series?.careCountDays);
  const careCountEmptyLabel = t("insights.emptyCareCount");
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
  return (
    <div
      className={cn(SHELL_FULL_SPAN, SHELL_DASHBOARD_STACK, "fx-fade-in")}
      data-testid="baby-insights-dashboard"
    >
      <p
        className="text-sm text-muted"
        data-testid="baby-insights-activities-cue"
      >
        {t("insights.activitiesCue")}{" "}
        <Link
          href="/baby/activities"
          className="font-medium text-accent underline-offset-4 hover:underline"
        >
          {t("insights.activitiesCueLink")}
        </Link>
      </p>

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
                partialNote={null}
                days={careCountDays}
                ready={!seriesQuery.isLoading && careCountFromSeries}
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
                href="/baby/growth"
                className="text-sm font-medium text-accent underline-offset-4 hover:underline"
              >
                {t("insights.logMeasure")}
              </Link>
              {hasMoreGrowth ? (
                <Button
                  type="button"
                  size="lg"
                  variant="secondary"
                  data-testid="baby-insights-growth-load-more"
                  disabled={
                    growthLoadMorePending || growthQuery.isFetchingNextPage
                  }
                  onClick={() => {
                    startGrowthLoadMore(() => {
                      void growthQuery.fetchNextPage();
                    });
                  }}
                >
                  {t("timeline.loadMore")}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

    </div>
  );
}
