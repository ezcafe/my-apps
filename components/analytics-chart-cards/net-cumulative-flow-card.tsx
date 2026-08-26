"use client";

import dynamic from "next/dynamic";
import { memo, useMemo, useState, type Ref } from "react";
import { Card } from "@/components/ui/card";
import { AboutDisclosure } from "@/components/ui/about-disclosure";
import {
  AnalyticsChartContainer,
  AnalyticsEmptyState,
  CHART_EMPTY_TRANSACTION_ACTIONS,
  ChartViewportFallback,
  DeferredChartLoading,
  type ChartDrilldownHandler,
  type ThemeSlice,
} from "@/components/analytics-chart-card-shared";
import { ChartLegendList } from "@/components/charts/chart-legend-list";
import {
  chartExpenseColor,
  chartIncomeColor,
} from "@/components/charts/chart-income-expense-colors";
import { toggleSetKey } from "@/lib/chart-legend-toggle";
import { formatMinor } from "@/lib/format-money";
import type { MoneyAnalyticsOverviewPayload } from "@/lib/money-services/analytics";
import {
  calendarDayBounds,
  linePointDateForDrilldown,
  mergeDrilldownQuery,
} from "@/lib/analytics-build-query";
import {
  CHART_CARD_HEIGHT_TALL,
  CHART_CARD_LAYOUT,
  CHART_SLOT_CLASS,
} from "@/components/analytics-chart-layout";

const LineChart = dynamic(
  () =>
    import("@/components/charts/line-chart").then((m) => ({
      default: m.LineChart,
    })),
  { ssr: false },
);

export const NetCumulativeFlowCard = memo(function NetCumulativeFlowCard({
  cardRef,
  inView,
  overviewReady,
  overview,
  lineHasData,
  lineCompareLabel,
  isCurrentMonthCompare,
  defaultCurrency,
  theme,
  title = "How does net balance change over time?",
  description,
  compareDescription,
  emptyState,
  baseFilterQuery,
  onDrilldown,
}: {
  cardRef: Ref<HTMLDivElement | null>;
  inView: boolean;
  overviewReady: boolean;
  overview: MoneyAnalyticsOverviewPayload | null;
  lineHasData: boolean;
  lineCompareLabel: string | null;
  isCurrentMonthCompare: boolean;
  defaultCurrency: string;
  theme: ThemeSlice;
  title?: string;
  description?: string;
  compareDescription?: string;
  emptyState?: {
    title: string;
    description: string;
    primaryAction?: { href: string; label: string };
    secondaryAction?: { href: string; label: string };
  };
  baseFilterQuery?: string;
  onDrilldown?: ChartDrilldownHandler;
}) {
  const { resolved, style } = theme;
  const overviewLine = useMemo(() => overview?.line ?? [], [overview?.line]);
  const overviewLineCompare = overview?.lineCompare;
  const overviewLineMode = overview?.lineMode ?? "date";
  const [hiddenLineSeries, setHiddenLineSeries] = useState(
    () => new Set<"primary" | "compare">(),
  );

  const handleLineClick = useMemo(() => {
    if (!baseFilterQuery || !onDrilldown) return undefined;
    return (item: { date: string; series: "primary" }) => {
      const day = linePointDateForDrilldown(
        item.date,
        overviewLineMode,
        baseFilterQuery,
      );
      if (!day) return;
      const bounds = calendarDayBounds(day);
      onDrilldown({
        title: `${day} · Net flow`,
        filterQuery: mergeDrilldownQuery(baseFilterQuery, bounds),
      });
    };
  }, [baseFilterQuery, onDrilldown, overviewLineMode]);

  const linePrimaryColor = useMemo(() => {
    const last = overviewLine[overviewLine.length - 1]?.netMinor ?? 0;
    return last < 0
      ? chartExpenseColor(resolved, style)
      : chartIncomeColor(resolved, style);
  }, [overviewLine, resolved, style]);

  const lineLegendItems = useMemo(() => {
    const items = [
      {
        key: "primary",
        label: isCurrentMonthCompare ? "This month" : "Selected range",
        color: linePrimaryColor,
        valueText: formatMinor(
          overviewLine[overviewLine.length - 1]?.netMinor ?? 0,
          defaultCurrency,
        ),
      },
    ];
    if (overviewLineCompare && lineCompareLabel) {
      const compareLast =
        overviewLineCompare.points[overviewLineCompare.points.length - 1]
          ?.netMinor ?? 0;
      items.push({
        key: "compare",
        label: lineCompareLabel,
        color: "var(--muted)",
        valueText: formatMinor(compareLast, defaultCurrency),
      });
    }
    return items;
  }, [
    overviewLine,
    overviewLineCompare,
    lineCompareLabel,
    linePrimaryColor,
    defaultCurrency,
    isCurrentMonthCompare,
  ]);

  return (
    <Card
      className={`col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_TALL}`}
      ref={cardRef}
    >
      <h2 className="mb-2 flex flex-wrap items-center gap-x-2 font-display text-lg font-medium">
        {title}
        <AboutDisclosure compact label="About net cumulative flow">
          Running total of income minus expenses across the selected range. Each point adds that
          day&apos;s net to the line above it.
        </AboutDisclosure>
      </h2>
      {overviewLineCompare ? (
        <p className="mb-2 text-xs text-muted">
          {compareDescription ??
            (lineCompareLabel
              ? `Solid: this month through today. Dashed: ${lineCompareLabel}.`
              : "Solid: this month through today.")}
        </p>
      ) : (
        <p className="mb-2 text-xs text-muted">
          {description ??
            "Cumulative income minus expenses for the selected range."}
        </p>
      )}
      <AnalyticsChartContainer
        legend={
          lineHasData && inView ? (
            <ChartLegendList
              items={lineLegendItems}
              hiddenKeys={hiddenLineSeries}
              onToggle={(key) =>
                setHiddenLineSeries((s) =>
                  toggleSetKey(s, key as "primary" | "compare"),
                )
              }
              showValues={false}
            />
          ) : undefined
        }
      >
        {inView ? (
          !overviewReady ? (
            <DeferredChartLoading ariaLabel="Loading net cumulative flow chart" />
          ) : lineHasData ? (
            <LineChart
              data={overviewLine}
              comparison={
                overviewLineCompare && lineCompareLabel
                  ? {
                      label: lineCompareLabel,
                      data: overviewLineCompare.points,
                    }
                  : undefined
              }
              xMode={overviewLineMode}
              formatY={(minor) => formatMinor(minor, defaultCurrency)}
              hiddenSeries={hiddenLineSeries}
              animate={inView}
              onItemClick={handleLineClick}
            />
          ) : (
            <AnalyticsEmptyState
              title={emptyState?.title ?? "No cash flow in this range"}
              description={
                emptyState?.description ??
                "Widen the range or add transactions."
              }
              descriptionClassName="line-clamp-1"
              minHeightClass="min-h-0"
              className={CHART_SLOT_CLASS}
              {...(emptyState?.primaryAction || emptyState?.secondaryAction
                ? {
                    primaryAction: emptyState.primaryAction,
                    secondaryAction: emptyState.secondaryAction,
                  }
                : CHART_EMPTY_TRANSACTION_ACTIONS)}
            />
          )
        ) : (
          <ChartViewportFallback ariaLabel="Net cumulative flow chart loads when this section is visible" />
        )}
      </AnalyticsChartContainer>
    </Card>
  );
});

export default NetCumulativeFlowCard;
