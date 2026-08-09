"use client";

import dynamic from "next/dynamic";
import { memo, useMemo, type Ref } from "react";
import { Card } from "@/components/ui/card";
import {
  AnalyticsChartContainer,
  AnalyticsEmptyState,
  ChartViewportFallback,
  DeferredChartLoading,
  type ChartDrilldownHandler,
} from "@/components/analytics-chart-card-shared";
import type { MoneyAnalyticsBudgetPayload } from "@/lib/money-services/analytics";
import { budgetRowsForChart } from "@/lib/analytics-budget-label";
import {
  categoryIdForDrilldown,
  mergeDrilldownQuery,
} from "@/lib/analytics-build-query";
import {
  CHART_CARD_HEIGHT_HALF,
  CHART_CARD_LAYOUT,
  CHART_SLOT_CLASS,
} from "@/components/analytics-chart-layout";

const HorizontalBarChart = dynamic(
  () =>
    import("@/components/charts/horizontal-bar-chart").then((m) => ({
      default: m.HorizontalBarChart,
    })),
  { ssr: false },
);

export const BudgetVsActualCard = memo(function BudgetVsActualCard({
  cardRef,
  inView,
  lookupsReady,
  budgets,
  budgetChartRows,
  budgetChartHasData,
  formatChartValue,
  baseFilterQuery,
  onDrilldown,
}: {
  cardRef: Ref<HTMLDivElement | null>;
  inView: boolean;
  lookupsReady: boolean;
  budgets: MoneyAnalyticsBudgetPayload | null;
  budgetChartRows: ReturnType<typeof budgetRowsForChart>;
  budgetChartHasData: boolean;
  formatChartValue: (minor: number) => string;
  baseFilterQuery?: string;
  onDrilldown?: ChartDrilldownHandler;
}) {
  const handleBudgetClick = useMemo(() => {
    if (!baseFilterQuery || !onDrilldown) return undefined;
    return (item: { key: string; label: string }) => {
      const row = budgetChartRows.find((d) => d.key === item.key);
      if (!row) return;
      const extra =
        row.scopeType === "category" && row.scopeId
          ? {
              categoryIds: [categoryIdForDrilldown(row.scopeId)],
              kinds: ["expense" as const],
            }
          : row.scopeType === "account" && row.scopeId
            ? {
                accountIds: [row.scopeId],
                kinds: ["expense" as const],
              }
            : row.scopeType === "tag" && row.scopeId
              ? {
                  tagIds: [row.scopeId],
                  kinds: ["expense" as const],
                }
              : { kinds: ["expense" as const] };
      onDrilldown({
        title: `${item.label} · Budget`,
        filterQuery: mergeDrilldownQuery(baseFilterQuery, extra),
      });
    };
  }, [baseFilterQuery, onDrilldown, budgetChartRows]);

  return (
    <Card
      className={`min-w-0 p-4 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_HALF}`}
      ref={cardRef}
    >
      <h2 className="mb-2 font-display text-lg font-medium">Budget vs actual</h2>
      <p className="mb-2 text-xs text-muted">
        Spent amount against budget limit for the selected range.
      </p>
      <AnalyticsChartContainer>
        {!inView ? (
          <ChartViewportFallback ariaLabel="Budget chart loads when this section is visible" />
        ) : !budgets || !lookupsReady ? (
          <DeferredChartLoading ariaLabel="Loading budget chart" />
        ) : budgetChartHasData ? (
          <HorizontalBarChart
            data={budgetChartRows}
            formatValue={formatChartValue}
            variant="budget"
            onItemClick={handleBudgetClick}
          />
        ) : (
          <AnalyticsEmptyState
            title="No budgets in this workspace"
            description="Create budgets in Money settings."
            minHeightClass="min-h-0"
            className={CHART_SLOT_CLASS}
            action={{ href: "/money/settings", label: "Money settings" }}
          />
        )}
      </AnalyticsChartContainer>
    </Card>
  );
});

export default BudgetVsActualCard;
