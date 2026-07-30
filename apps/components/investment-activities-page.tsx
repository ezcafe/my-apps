"use client";

import { useQuery } from "@tanstack/react-query";
import { useInvestmentWorkspace } from "@/components/investment-workspace-provider";
import {
  MoneyEmptyState,
  MoneyListSkeleton,
  MoneyQueryErrorAlert,
} from "@/components/money-feedback";
import { Card } from "@/components/ui/card";
import { formatMinor } from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import { investmentActivitiesQueryOptions } from "@/lib/investment-query-options";

export function InvestmentActivitiesPage() {
  const { workspaceReady } = useInvestmentWorkspace();
  const { formatDate } = useFormatDate();
  const activitiesQuery = useQuery({
    ...investmentActivitiesQueryOptions({ limit: 100 }),
    enabled: workspaceReady,
  });

  return (
    <div className="col-span-2 min-w-0 md:col-span-6 lg:col-span-12">
      <Card className="@container p-4">
        <h2 className="font-display text-lg font-medium">Activities</h2>
        {activitiesQuery.isLoading ? (
          <div className="mt-4">
            <MoneyListSkeleton variant="tableRows" />
          </div>
        ) : null}
        {activitiesQuery.isError ? (
          <div className="mt-4">
            <MoneyQueryErrorAlert
              title="Couldn’t load activities"
              error={activitiesQuery.error}
              onRetry={() => void activitiesQuery.refetch()}
            />
          </div>
        ) : null}
        {activitiesQuery.isSuccess && activitiesQuery.data.items.length === 0 ? (
          <div className="mt-4">
            <MoneyEmptyState
              icon="investment"
              accentChartIndex={4}
              title="No activities yet"
              description="Record a buy, sell, or dividend to start building your portfolio history."
              minHeightClass="min-h-[160px]"
              primaryAction={{
                href: "/money/investments/new",
                label: "Record activity",
              }}
            />
          </div>
        ) : null}
        {activitiesQuery.isSuccess && activitiesQuery.data.items.length > 0 ? (
          <div className="mt-4 overflow-x-auto @md:block">
            <table className="hidden min-w-full divide-y divide-border text-left text-sm @md:table">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 font-medium">Instrument</th>
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 pr-4 font-medium text-right">Qty</th>
                  <th className="pb-2 pr-4 font-medium text-right">Amount</th>
                  <th className="pb-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activitiesQuery.data.items.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      {formatDate(row.activityDate)}
                    </td>
                    <td className="py-2.5 pr-4">
                      {row.instrumentSymbol}{" "}
                      <span className="text-muted">· {row.instrumentName}</span>
                    </td>
                    <td className="py-2.5 pr-4 capitalize">{row.type}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {row.quantity ?? "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums font-medium">
                      {row.amountMinor != null
                        ? formatMinor(row.amountMinor, row.instrumentCurrency)
                        : "—"}
                    </td>
                    <td className="py-2.5 max-w-[16rem] truncate text-muted">
                      {row.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-2 @md:hidden">
              {activitiesQuery.data.items.map((row) => (
                <div
                  key={row.id}
                  className="rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{row.instrumentSymbol}</p>
                    <span className="text-xs text-muted tabular-nums">
                      {formatDate(row.activityDate)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm capitalize text-muted">{row.type}</p>
                  <p className="mt-2 text-sm font-medium tabular-nums">
                    {row.amountMinor != null
                      ? formatMinor(row.amountMinor, row.instrumentCurrency)
                      : "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
