"use client";

import { queryErrorMessage } from "@/lib/user-facing-error";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { AnalyticsLookupAccount } from "@/components/analytics-filters";
import { colorByIndex } from "@/components/charts/chart-colors";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMinor } from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import {
  moneyCategoryById,
  moneyCategoryLabel,
  type MoneyCategoryRow,
} from "@/lib/money-category-ui";
import {
  moneyTransactionsQueryOptions,
  type MoneyTransactionListRow,
} from "@/lib/money-query-options";

const PAGE_SIZE = 15;

function truncateNote(s: string | null, max = 48): string {
  if (s == null || s === "") return "—";
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function AnalyticsChartDrilldownModal({
  open,
  onClose,
  title,
  filterQuery,
  activeWorkspaceId,
  accounts,
  categories,
  currency,
  onEditTransaction,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  filterQuery: string;
  activeWorkspaceId: string;
  accounts: AnalyticsLookupAccount[];
  categories: MoneyCategoryRow[];
  currency: string;
  onEditTransaction: (transactionId: string) => void;
}) {
  const [page, setPage] = useState(1);
  const { formatDate } = useFormatDate();
  const { resolved, style } = useTheme();
  const incomeAmountColor = colorByIndex(resolved, 3, style);

  useEffect(() => {
    if (open) setPage(1);
  }, [open, filterQuery]);

  const listQuery = useQuery({
    ...moneyTransactionsQueryOptions(
      activeWorkspaceId,
      filterQuery,
      page,
      PAGE_SIZE,
      "occurredAt",
      "desc",
    ),
    enabled: open && Boolean(activeWorkspaceId) && Boolean(filterQuery),
  });

  const accountById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );
  const categoryById = useMemo(() => moneyCategoryById(categories), [categories]);

  const payload = listQuery.data;
  const rows = payload?.data ?? [];
  const total = payload?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const modalTitleId = "chart-drilldown-title";

  return (
    <Modal
      open={open}
      onClose={onClose}
      bare
      labelledBy={modalTitleId}
      className="w-[min(100vw-2rem,42rem)] max-h-[min(100dvh-2rem,36rem)] overflow-hidden p-0"
    >
      <div className="flex max-h-[min(100dvh-2rem,36rem)] flex-col">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 id={modalTitleId} className="font-display text-lg font-medium">
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {listQuery.isSuccess
                ? `${total.toLocaleString()} transaction${total === 1 ? "" : "s"}`
                : "Loading…"}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto">
          {listQuery.isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : listQuery.isError ? (
            <p className="p-4 text-sm text-destructive" role="alert">
              {queryErrorMessage(listQuery.error) ?? "Could not load transactions"}
            </p>
          ) : rows.length === 0 ? (
            <p className="p-4 text-sm text-muted">No transactions in this slice.</p>
          ) : (
            <table className="w-full min-w-[28rem] text-sm">
              <thead className="sticky top-0 bg-surface text-left text-xs text-muted">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Account</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Notes</th>
                  <th className="px-3 py-2 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((tx) => (
                  <DrilldownRow
                    key={tx.id}
                    tx={tx}
                    accountById={accountById}
                    categoryById={categoryById}
                    currency={currency}
                    incomeAmountColor={incomeAmountColor}
                    formatDate={formatDate}
                    onEdit={() => onEditTransaction(tx.id)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 ? (
          <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-4 py-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page <= 1 || listQuery.isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-xs text-muted">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page >= totalPages || listQuery.isFetching}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </footer>
        ) : null}
      </div>
    </Modal>
  );
}

function DrilldownRow({
  tx,
  accountById,
  categoryById,
  currency,
  incomeAmountColor,
  formatDate,
  onEdit,
}: {
  tx: MoneyTransactionListRow;
  accountById: Map<string, AnalyticsLookupAccount>;
  categoryById: Map<string, MoneyCategoryRow>;
  currency: string;
  incomeAmountColor: string;
  formatDate: (iso: string, opts?: { omitYear?: boolean }) => string;
  onEdit: () => void;
}) {
  const acc = accountById.get(tx.accountId);
  const cat = tx.categoryId ? categoryById.get(tx.categoryId) : null;
  const categoryLabel =
    cat != null ? moneyCategoryLabel(cat, categoryById) : "—";
  const amountLabel = formatMinor(tx.amountMinor, currency);

  return (
    <tr className="border-b border-border/60 transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--foreground)_4%,transparent)]">
      <td className="whitespace-nowrap px-3 py-2 text-muted">
        {formatDate(tx.occurredAt, { omitYear: true })}
      </td>
      <td className="max-w-[8rem] truncate px-3 py-2">{acc?.name ?? "—"}</td>
      <td className="max-w-[8rem] truncate px-3 py-2">{categoryLabel}</td>
      <td
        className="whitespace-nowrap px-3 py-2 text-right tabular-nums"
        style={tx.kind === "income" ? { color: incomeAmountColor } : undefined}
      >
        {amountLabel}
      </td>
      <td className="max-w-[10rem] truncate px-3 py-2 text-muted">
        {truncateNote(tx.notes)}
      </td>
      <td className="whitespace-nowrap px-3 py-2">
        <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
      </td>
    </tr>
  );
}
