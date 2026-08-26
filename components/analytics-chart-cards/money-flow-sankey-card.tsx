"use client";

import dynamic from "next/dynamic";
import { memo, useMemo, type Ref } from "react";
import { Card } from "@/components/ui/card";
import { AboutDisclosure } from "@/components/ui/about-disclosure";
import {
  AnalyticsChartContainer,
  AnalyticsEmptyState,
  CHART_EMPTY_TRANSACTION_ACTIONS,
  ChartViewportFallback,
  DeferredChartLoading,
  type ChartDrilldownHandler,
} from "@/components/analytics-chart-card-shared";
import type { MoneyAnalyticsSankeyPayload } from "@/lib/money-services/analytics";
import {
  mergeDrilldownQuery,
  sankeyCategoryNodeFromId,
  seriesCategoryKeyForDrilldown,
} from "@/lib/analytics-build-query";
import {
  CHART_CARD_HEIGHT_TALL,
  CHART_CARD_LAYOUT,
  CHART_SLOT_CLASS,
} from "@/components/analytics-chart-layout";

const SankeyChart = dynamic(
  () =>
    import("@/components/charts/sankey-chart").then((m) => ({
      default: m.SankeyChart,
    })),
  { ssr: false },
);

export const MoneyFlowSankeyCard = memo(function MoneyFlowSankeyCard({
  cardRef,
  inView,
  sankeyPayload,
  sankeyHasData,
  defaultCurrency,
  baseFilterQuery,
  onDrilldown,
}: {
  cardRef: Ref<HTMLDivElement | null>;
  inView: boolean;
  sankeyPayload: MoneyAnalyticsSankeyPayload | null;
  sankeyHasData: boolean;
  defaultCurrency: string;
  baseFilterQuery?: string;
  onDrilldown?: ChartDrilldownHandler;
}) {
  const handleSankeyClick = useMemo(() => {
    if (!baseFilterQuery || !onDrilldown) return undefined;
    return (item: { nodeId: string; label: string }) => {
      const parsed = sankeyCategoryNodeFromId(item.nodeId);
      if (!parsed) return;
      const categoryId = seriesCategoryKeyForDrilldown(parsed.categoryId);
      if (!categoryId) return;
      onDrilldown({
        title: `${item.label} · Money flow`,
        filterQuery: mergeDrilldownQuery(baseFilterQuery, {
          categoryIds: [categoryId],
          kinds: [parsed.kind],
        }),
      });
    };
  }, [baseFilterQuery, onDrilldown]);

  return (
    <Card
      className={`col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_TALL}`}
      ref={cardRef}
    >
      <h2 className="mb-1 flex flex-wrap items-center gap-x-2 font-display text-lg font-medium">
        How does money move between categories?
        <AboutDisclosure compact label="About money flow">
          Net income categories flow toward Cash Flow; net expense categories flow out from Cash
          Flow. When parent and subcategory directions match, the flow chains through parent and
          child levels.
        </AboutDisclosure>
      </h2>
      <p className="mb-2 text-xs text-muted">
        Income in, expenses out — grouped by category for the selected range.
      </p>
      <AnalyticsChartContainer className="text-foreground">
        {!inView ? (
          <ChartViewportFallback ariaLabel="Money flow chart loads when this section is visible" />
        ) : !sankeyPayload ? (
          <DeferredChartLoading ariaLabel="Loading money flow chart" />
        ) : sankeyHasData ? (
          <SankeyChart
            nodes={sankeyPayload.sankey.nodes}
            links={sankeyPayload.sankey.links}
            currency={defaultCurrency}
            animate={inView}
            onItemClick={handleSankeyClick}
          />
        ) : (
          <AnalyticsEmptyState
            icon="flow"
            title="No money flow for this range"
            description="Add categorized expenses or income, or widen the date range."
            minHeightClass="min-h-0"
            className={CHART_SLOT_CLASS}
            {...CHART_EMPTY_TRANSACTION_ACTIONS}
          />
        )}
      </AnalyticsChartContainer>
    </Card>
  );
});

export default MoneyFlowSankeyCard;
