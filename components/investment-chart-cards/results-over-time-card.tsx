"use client";

import dynamic from "next/dynamic";
import { memo } from "react";
import { Card } from "@/components/ui/card";
import {
  AnalyticsChartContainer,
  AnalyticsEmptyState,
  DeferredChartLoading,
} from "@/components/analytics-chart-card-shared";
import {
  CHART_CARD_HEIGHT_HALF,
  CHART_CARD_LAYOUT,
  CHART_SLOT_CLASS,
} from "@/components/analytics-chart-layout";
import type { InvestmentPortfolioPoint } from "@/lib/investment-query-options";

const LineChart = dynamic(
  () =>
    import("@/components/charts/line-chart").then((m) => ({
      default: m.LineChart,
    })),
  { ssr: false },
);

export const InvestmentResultsOverTimeCard = memo(
  function InvestmentResultsOverTimeCard({
    ready,
    series,
    formatY,
  }: {
    ready: boolean;
    series: InvestmentPortfolioPoint[];
    formatY: (minor: number) => string;
  }) {
    const hasData = series.some((p) => p.totalMinor !== 0);
    const lineData = series.map((p) => ({ date: p.date, netMinor: p.totalMinor }));

    return (
      <Card
        className={`w-full min-w-0 p-4 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_HALF}`}
      >
        <h2 className="mb-2 font-display text-lg font-medium">Results over time</h2>
        <p className="mb-2 text-xs text-muted">
          Realized P&amp;L plus mark-to-market on open lots.
        </p>
        <AnalyticsChartContainer>
          {!ready ? (
            <DeferredChartLoading ariaLabel="Loading results chart" />
          ) : hasData ? (
            <LineChart data={lineData} formatY={formatY} animate />
          ) : (
            <AnalyticsEmptyState
              title="No results in this range"
              description="Record a trade to build the equity curve."
              minHeightClass="min-h-0"
              className={CHART_SLOT_CLASS}
              icon="investment"
              accentChartIndex={4}
              primaryAction={{ href: "/investments/new", label: "Record activity" }}
            />
          )}
        </AnalyticsChartContainer>
      </Card>
    );
  },
);
