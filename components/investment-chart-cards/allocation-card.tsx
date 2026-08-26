"use client";

import dynamic from "next/dynamic";
import { memo, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  AnalyticsChartContainer,
  AnalyticsEmptyState,
  DeferredChartLoading,
} from "@/components/analytics-chart-card-shared";
import { ChartLegendList } from "@/components/charts/chart-legend-list";
import { colorByIndex } from "@/components/charts/chart-colors";
import { toggleSetKey } from "@/lib/chart-legend-toggle";
import { formatMinor } from "@/lib/format-money";
import { useTheme } from "@/components/theme-provider";
import {
  CHART_CARD_HEIGHT_HALF,
  CHART_CARD_LAYOUT,
  CHART_SLOT_CLASS,
} from "@/components/analytics-chart-layout";

const PieByCategoryChart = dynamic(
  () =>
    import("@/components/charts/pie-chart").then((m) => ({
      default: m.PieByCategoryChart,
    })),
  { ssr: false },
);

export const InvestmentAllocationCard = memo(function InvestmentAllocationCard({
  ready,
  slices,
  currency,
}: {
  ready: boolean;
  slices: Array<{ label: string; valueMinor: number }>;
  currency: string;
}) {
  const { resolved, style } = useTheme();
  const [hidden, setHidden] = useState(() => new Set<string>());
  const [hovered, setHovered] = useState<string | null>(null);
  const hasData = slices.some((s) => s.valueMinor > 0);
  const total = slices.reduce((sum, s) => sum + s.valueMinor, 0);

  const legendItems = useMemo(
    () =>
      slices.map((p, i) => ({
        key: p.label,
        label: p.label,
        color: colorByIndex(resolved, i, style),
        valueText: formatMinor(p.valueMinor, currency),
      })),
    [slices, resolved, style, currency],
  );

  return (
    <Card
      className={`min-w-0 p-4 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_HALF}`}
    >
      <h2 className="mb-2 font-display text-lg font-medium">Allocation</h2>
      <p className="mb-2 text-xs text-muted">Open notional by instrument kind.</p>
      <AnalyticsChartContainer
        legend={
          ready && hasData ? (
            <ChartLegendList
              items={legendItems}
              hiddenKeys={hidden}
              onToggle={(key) => setHidden((s) => toggleSetKey(s, key))}
              hoveredKey={hovered}
              onHover={setHovered}
              showValues={false}
            />
          ) : undefined
        }
      >
        {!ready ? (
          <DeferredChartLoading ariaLabel="Loading allocation chart" />
        ) : hasData ? (
          <PieByCategoryChart
            data={slices}
            hiddenLabels={hidden}
            hoveredLabel={hovered}
            formatValue={(minor) => formatMinor(minor, currency)}
            centerTotalMinor={total}
            centerLabel="Notional"
          />
        ) : (
          <AnalyticsEmptyState
            title="No open notional"
            description="Open a lot to see concentration by kind."
            minHeightClass="min-h-0"
            className={CHART_SLOT_CLASS}
            icon="investment"
            accentChartIndex={4}
            action={{ href: "/investments/instruments", label: "Instruments" }}
          />
        )}
      </AnalyticsChartContainer>
    </Card>
  );
});
