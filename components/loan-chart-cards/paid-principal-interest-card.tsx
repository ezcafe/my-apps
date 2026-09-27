"use client";

import dynamic from "next/dynamic";
import { memo } from "react";
import { Card } from "@/components/ui/card";
import { useFormatDate } from "@/lib/format-date";
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

import {
  loansDrilldownForPaidInRange,
  type LoansChartDrilldownPayload,
} from "@/lib/loans-chart-drilldown";

const DivergingBarChart = dynamic(
  () =>
    import("@/components/charts/diverging-bar-chart").then((m) => ({
      default: m.DivergingBarChart,
    })),
  { ssr: false },
);

export const LoansPaidPrincipalInterestCard = memo(
  function LoansPaidPrincipalInterestCard({
    ready,
    principalMinor,
    interestMinor,
    formatValue,
    periodFrom,
    periodTo,
    onDrilldown,
  }: {
    ready: boolean;
    principalMinor: number;
    interestMinor: number;
    formatValue: (minor: number) => string;
    periodFrom?: string;
    periodTo?: string;
    onDrilldown?: (payload: LoansChartDrilldownPayload) => void;
  }) {
    const { formatPeriod } = useFormatDate();
    const hasData = principalMinor > 0 || interestMinor > 0;
    const period =
      periodFrom && periodTo ? formatPeriod(periodFrom, periodTo) : null;
    return (
      <Card
        className={`w-full min-w-0 p-4 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_HALF}`}
      >
        <h2 className="mb-2 font-display text-lg font-medium">
          Paid principal vs interest
        </h2>
        <p className="mb-2 text-xs text-muted">
          Principal paydown (left) versus interest cost (right) on installments
          paid in the selected period{period ? ` (${period})` : ""}.
        </p>
        <AnalyticsChartContainer>
          {!ready ? (
            <DeferredChartLoading ariaLabel="Loading principal versus interest" />
          ) : hasData ? (
            <DivergingBarChart
              incomeMinor={principalMinor}
              expenseMinor={interestMinor}
              formatValue={formatValue}
              onItemClick={() => {
                if (!onDrilldown || !periodFrom || !periodTo) return;
                onDrilldown(
                  loansDrilldownForPaidInRange({
                    from: periodFrom,
                    to: periodTo,
                  }),
                );
              }}
            />
          ) : (
            <AnalyticsEmptyState
              title="No payments yet"
              description="Mark an installment paid to split principal and interest."
              minHeightClass="min-h-0"
              className={CHART_SLOT_CLASS}
              icon="loan"
              accentChartIndex={6}
              primaryAction={{ href: "/loans", label: "View loans" }}
            />
          )}
        </AnalyticsChartContainer>
      </Card>
    );
  },
);
