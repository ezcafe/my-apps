"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
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
import { queryErrorMessage } from "@/lib/user-facing-error";
import type { InvestmentChartDrilldownPayload } from "@/lib/investment-chart-drilldown";
import { investmentActivitiesQueryOptions } from "@/lib/investment-query-options";

export function InvestmentChartDrilldownModal({
  open,
  onClose,
  drill,
}: {
  open: boolean;
  onClose: () => void;
  drill: InvestmentChartDrilldownPayload | null;
}) {
  const { formatDate } = useFormatDate();
  const pageKey = `${open ? "1" : "0"}:${JSON.stringify(drill?.query ?? {})}`;
  const [pageState, setPageState] = useState({
    key: pageKey,
    cursor: null as string | null,
  });
  if (pageState.key !== pageKey) {
    setPageState({ key: pageKey, cursor: null });
  }

  const listQuery = useQuery({
    ...investmentActivitiesQueryOptions({
      ...(drill?.query ?? {}),
      cursor: pageState.cursor ?? undefined,
    }),
    enabled: open && Boolean(drill),
  });

  const rows = listQuery.data?.items ?? [];
  const nextCursor = listQuery.data?.nextCursor ?? null;
  const modalTitleId = "investment-chart-drilldown-title";

  return (
    <Modal
      open={open && Boolean(drill)}
      onClose={onClose}
      bare
      labelledBy={modalTitleId}
      className="w-[min(100vw-2rem,42rem)] max-h-[min(100dvh-2rem,36rem)] overflow-hidden p-0"
    >
      <div className="flex h-full max-h-[min(100dvh-2rem,36rem)] min-h-0 flex-col">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 id={modalTitleId} className="font-display text-lg font-medium">
              {drill?.title ?? "Activities"}
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              {listQuery.isSuccess
                ? `${rows.length} activit${rows.length === 1 ? "y" : "ies"}`
                : "Loading…"}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
          {listQuery.isLoading ? (
            <div className="flex flex-col gap-2" aria-busy="true">
              <Skeleton className="h-8 w-full rounded-[var(--radius-sm)]" />
              <Skeleton className="h-8 w-full rounded-[var(--radius-sm)]" />
            </div>
          ) : listQuery.isError ? (
            <p className="p-1 text-sm text-destructive" role="alert">
              {queryErrorMessage(listQuery.error) ?? "Could not load activities"}
            </p>
          ) : rows.length === 0 ? (
            <p className="p-1 text-sm text-muted">No activities for this slice.</p>
          ) : (
            <Table maxHeight="100%" className="min-h-0 flex-1">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Instrument</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDate(row.activityDate)}</TableCell>
                    <TableCell className="max-w-[10rem] truncate">
                      {row.instrumentSymbol || row.instrumentName}
                    </TableCell>
                    <TableCell className="capitalize">{row.type}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.amountMinor == null
                        ? "—"
                        : formatMinor(row.amountMinor, row.instrumentCurrency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3">
          {nextCursor ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setPageState((s) => ({ ...s, cursor: nextCursor }))
              }
            >
              Load more
            </Button>
          ) : null}
          <Button type="button" size="sm" onClick={onClose}>
            Close
          </Button>
        </footer>
      </div>
    </Modal>
  );
}
