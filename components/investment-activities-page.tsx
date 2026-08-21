"use client";

import { useQuery } from "@tanstack/react-query";
import { useInvestmentWorkspace } from "@/components/investment-workspace-provider";
import {
  MoneyEmptyState,
  MoneyListSkeleton,
  MoneyQueryErrorAlert,
} from "@/components/money-feedback";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <section className="@container w-full min-w-0">
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
        <div className="mt-4">
          <div className="hidden @md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead freeze="leading">Date</TableHead>
                  <TableHead>Instrument</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead align="end">Qty</TableHead>
                  <TableHead align="end">Amount</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activitiesQuery.data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell
                      freeze="leading"
                      className="whitespace-nowrap"
                    >
                      {formatDate(row.activityDate)}
                    </TableCell>
                    <TableCell>
                      {row.instrumentSymbol}{" "}
                      <span className="text-muted">· {row.instrumentName}</span>
                    </TableCell>
                    <TableCell className="capitalize">{row.type}</TableCell>
                    <TableCell align="end" numeric>
                      {row.quantity ?? "—"}
                    </TableCell>
                    <TableCell align="end" numeric className="font-medium">
                      {row.amountMinor != null
                        ? formatMinor(row.amountMinor, row.instrumentCurrency)
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-[16rem] truncate text-muted">
                      {row.notes ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-2 @md:hidden">
            {activitiesQuery.data.items.map((row) => (
              <div
                key={row.id}
                className="rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{row.instrumentSymbol}</p>
                  <span className="text-sm text-muted tabular-nums">
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
    </section>
  );
}
