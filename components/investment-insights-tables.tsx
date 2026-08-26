"use client";

import Link from "next/link";
import { Tag } from "@/components/ui/tag";
import { buttonClassName } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowActions,
} from "@/components/ui/table";
import {
  MoneyListSkeleton,
  MoneyQueryErrorAlert,
} from "@/components/money-feedback";
import { formatMinor } from "@/lib/format-money";
import { formatQuantityDisplay } from "@/lib/investment-services/positions";
import { useFormatDate } from "@/lib/format-date";
import { cn } from "@/lib/cn";
import type {
  InvestmentActivityRow,
  InvestmentHoldingRow,
} from "@/lib/investment-query-options";
import type { UseQueryResult } from "@tanstack/react-query";

const HOLDING_SYMBOL_COLORS = [
  "text-chart-0",
  "text-chart-1",
  "text-chart-2",
  "text-chart-3",
  "text-chart-4",
  "text-chart-5",
  "text-chart-6",
  "text-chart-7",
] as const;

export function InvestmentHoldingsTable({
  holdings,
}: {
  holdings: InvestmentHoldingRow[];
}) {
  if (holdings.length === 0) {
    return (
      <section className="w-full min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-medium">Holdings</h2>
        </div>
        <p className="text-sm text-muted">No open holdings.</p>
      </section>
    );
  }
  return (
    <section className="w-full min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-medium">Holdings</h2>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead freeze="leading">Symbol</TableHead>
            <TableHead>Name</TableHead>
            <TableHead align="end">Volume</TableHead>
            <TableHead align="end">Value</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((row, index) => (
            <TableRow key={row.instrumentId}>
              <TableCell freeze="leading">
                <Tag
                  className={cn(
                    "font-medium",
                    HOLDING_SYMBOL_COLORS[index % 8],
                  )}
                >
                  {row.symbol}
                </Tag>
              </TableCell>
              <TableCell className="text-muted">{row.name}</TableCell>
              <TableCell align="end" numeric>
                {formatQuantityDisplay(row.quantity)}
              </TableCell>
              <TableCell align="end" numeric className="font-medium">
                {formatMinor(row.valueMinor, row.currency)}
              </TableCell>
              <TableCell>
                <TableRowActions>
                  <Link
                    href={`/investments/new?instrumentId=${row.instrumentId}`}
                    aria-label="Record activity"
                    className={buttonClassName({
                      variant: "secondary",
                      size: "sm",
                    })}
                  >
                    Activity
                  </Link>
                </TableRowActions>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

export function InvestmentOpenActivitiesTable({
  query,
}: {
  query: UseQueryResult<InvestmentActivityRow[]>;
}) {
  const { formatDate } = useFormatDate();
  return (
    <section className="w-full min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-medium">Open activities</h2>
      </div>
      {query.isLoading ? <MoneyListSkeleton variant="tableRows" /> : null}
      {query.isError ? (
        <MoneyQueryErrorAlert
          title="Couldn’t load open activities"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.isSuccess && query.data.length === 0 ? (
        <p className="text-sm text-muted">No open activities.</p>
      ) : null}
      {query.isSuccess && query.data.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead freeze="leading">Symbol</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead align="end">Volume</TableHead>
              <TableHead align="end">Open price</TableHead>
              <TableHead align="end">SL</TableHead>
              <TableHead align="end">TP</TableHead>
              <TableHead>Opened</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data.map((row, index) => (
              <TableRow key={row.id}>
                <TableCell freeze="leading">
                  <Tag
                    className={cn(
                      "font-medium",
                      HOLDING_SYMBOL_COLORS[index % 8],
                    )}
                  >
                    {row.instrumentSymbol}
                  </Tag>
                </TableCell>
                <TableCell className="capitalize">{row.type}</TableCell>
                <TableCell align="end" numeric>
                  {formatQuantityDisplay(row.quantity) || "—"}
                </TableCell>
                <TableCell align="end" numeric>
                  {row.openPrice ?? "—"}
                </TableCell>
                <TableCell align="end" numeric>
                  {row.stopLoss ?? "—"}
                </TableCell>
                <TableCell align="end" numeric>
                  {row.takeProfit ?? "—"}
                </TableCell>
                <TableCell className="text-muted">
                  {formatDate(row.activityDate, { omitYearIfCurrent: true })}
                </TableCell>
                <TableCell>
                  <TableRowActions>
                    <Link
                      href={`/investments/new?mode=close&openActivityId=${row.id}`}
                      aria-label={`Close ${row.instrumentSymbol}`}
                      className={buttonClassName({
                        variant: "secondary",
                        size: "sm",
                      })}
                    >
                      Close
                    </Link>
                  </TableRowActions>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </section>
  );
}
