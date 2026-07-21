"use client";

import { useQuery } from "@tanstack/react-query";
import { useInvestmentWorkspace } from "@/components/investment-workspace-provider";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMinor } from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import { queryErrorMessage } from "@/lib/user-facing-error";
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
      <Card className="p-4">
        <h2 className="font-display text-lg font-medium">Activities</h2>
        {activitiesQuery.isLoading ? (
          <Skeleton className="mt-4 h-48 w-full" />
        ) : null}
        {activitiesQuery.isError ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {queryErrorMessage(activitiesQuery.error) ?? "Could not load activities"}
          </p>
        ) : null}
        {activitiesQuery.isSuccess && activitiesQuery.data.items.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No activities yet.</p>
        ) : null}
        {activitiesQuery.isSuccess && activitiesQuery.data.items.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-left text-sm">
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
          </div>
        ) : null}
      </Card>
    </div>
  );
}
