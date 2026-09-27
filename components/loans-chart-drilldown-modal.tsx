"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
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
import type { LoansChartDrilldownPayload } from "@/lib/loans-chart-drilldown";
import { loansInstallmentsQueryOptions } from "@/lib/loans-query-options";

export function LoansChartDrilldownModal({
  open,
  onClose,
  drill,
}: {
  open: boolean;
  onClose: () => void;
  drill: LoansChartDrilldownPayload | null;
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
  const activeCursor = pageState.cursor;

  const listQuery = useQuery({
    ...loansInstallmentsQueryOptions({
      ...(drill?.query ?? {}),
      cursor: activeCursor ?? undefined,
    }),
    enabled: open && Boolean(drill),
  });

  const rows = listQuery.data?.items ?? [];
  const nextCursor = listQuery.data?.nextCursor ?? null;
  const currency = rows[0]?.currency ?? "VND";
  const modalTitleId = "loans-chart-drilldown-title";

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
              {drill?.title ?? "Installments"}
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              {listQuery.isSuccess
                ? `${rows.length} installment${rows.length === 1 ? "" : "s"}`
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
              <Skeleton className="h-8 w-full rounded-[var(--radius-sm)]" />
            </div>
          ) : listQuery.isError ? (
            <p className="p-1 text-sm text-destructive" role="alert">
              {queryErrorMessage(listQuery.error) ??
                "Could not load installments"}
            </p>
          ) : rows.length === 0 ? (
            <p className="p-1 text-sm text-muted">
              No installments for this slice.
            </p>
          ) : (
            <Table maxHeight="100%" className="min-h-0 flex-1">
              <TableHeader>
                <TableRow>
                  <TableHead>Due</TableHead>
                  <TableHead>Loan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.scheduleInstallmentId}>
                    <TableCell>{formatDate(row.dueDate)}</TableCell>
                    <TableCell className="max-w-[10rem] truncate">
                      {row.loanName}
                    </TableCell>
                    <TableCell className="capitalize">{row.status}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMinor(row.paymentMinor, currency)}
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
          {drill?.openLoanId ? (
            <Link
              href={`/loans/${drill.openLoanId}`}
              className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-border bg-secondary px-4 text-sm text-secondary-foreground transition-colors hover:bg-secondary-hover"
            >
              Open loan
            </Link>
          ) : null}
          <Button type="button" size="sm" onClick={onClose}>
            Close
          </Button>
        </footer>
      </div>
    </Modal>
  );
}
