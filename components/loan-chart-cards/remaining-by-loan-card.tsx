"use client";

import dynamic from "next/dynamic";
import { memo, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import {
  AnalyticsChartContainer,
  AnalyticsEmptyState,
  DeferredChartLoading,
} from "@/components/analytics-chart-card-shared";
import { ChartLegendList } from "@/components/charts/chart-legend-list";
import { colorByIndex } from "@/components/charts/chart-colors";
import { toggleSetKey } from "@/lib/chart-legend-toggle";
import { formatCompactMinor } from "@/lib/format-money";
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

export const LoansRemainingByLoanCard = memo(function LoansRemainingByLoanCard({
  ready,
  slices,
  currency,
}: {
  ready: boolean;
  slices: Array<{ id: string; label: string; valueMinor: number }>;
  currency: string;
}) {
  const router = useRouter();
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
        valueText: formatCompactMinor(p.valueMinor, currency),
      })),
    [slices, resolved, style, currency],
  );

  return (
    <Card
      className={`min-w-0 p-4 ${CHART_CARD_LAYOUT} ${CHART_CARD_HEIGHT_HALF}`}
    >
      <h2 className="mb-2 font-display text-lg font-medium">Remaining by loan</h2>
      <p className="mb-2 text-xs text-muted">Tap a slice to open the loan.</p>
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
          <DeferredChartLoading ariaLabel="Loading remaining by loan" />
        ) : hasData ? (
          <PieByCategoryChart
            data={slices.map((s) => ({
              label: s.label,
              valueMinor: s.valueMinor,
              categoryId: s.id,
            }))}
            hiddenLabels={hidden}
            hoveredLabel={hovered}
            formatValue={(minor) => formatCompactMinor(minor, currency)}
            centerTotalMinor={total}
            centerLabel="Owed"
            onItemClick={(item) => {
              const id = item.categoryId;
              if (id) router.push(`/loans/${id}`);
            }}
          />
        ) : (
          <AnalyticsEmptyState
            title="Nothing remaining"
            description="Active loans with a balance will show here."
            minHeightClass="min-h-0"
            className={CHART_SLOT_CLASS}
            icon="loan"
            accentChartIndex={6}
          />
        )}
      </AnalyticsChartContainer>
    </Card>
  );
});
