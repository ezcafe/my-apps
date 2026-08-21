"use client";

import { queryErrorMessage } from "@/lib/user-facing-error";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { AnalyticsLookupAccount } from "@/components/analytics-filters";
import { colorByIndex } from "@/components/charts/chart-colors";
import { useTheme } from "@/components/theme-provider";
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
  TableSortButton,
  tableSortAria,
} from "@/components/ui/table";
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
import type { TransactionListSortKey } from "@/lib/validators/money";

const PAGE_SIZE = 15;

function truncateNote(s: string | null, max = 48): string {
  if (s == null || s === "") return "—";
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function defaultDirForSort(): "asc" | "desc" {
  return "desc";
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
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  filterQuery: string;
  activeWorkspaceId: string;
  accounts: AnalyticsLookupAccount[];
  categories: MoneyCategoryRow[];
  currency: string;
}) {
  const { formatDate } = useFormatDate();
  const { resolved, style } = useTheme();
  const incomeAmountColor = colorByIndex(resolved, 3, style);

  const pageResetKey = `${open ? "1" : "0"}:${JSON.stringify(filterQuery)}`;
  const [pageState, setPageState] = useState({ key: pageResetKey, page: 1 });
  if (pageState.key !== pageResetKey) {
    setPageState({ key: pageResetKey, page: 1 });
  }
  const page = pageState.page;
  const setPage = (next: number | ((p: number) => number)) => {
    setPageState((s) => ({
      key: s.key,
      page: typeof next === "function" ? next(s.page) : next,
    }));
  };

  const [{ sort, dir }, setSortState] = useState<{
    sort: TransactionListSortKey;
    dir: "asc" | "desc";
  }>({ sort: "occurredAt", dir: "desc" });

  const listQuery = useQuery({
    ...moneyTransactionsQueryOptions(
      activeWorkspaceId,
      filterQuery,
      page,
      PAGE_SIZE,
      sort,
      dir,
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

  const onSortHeader = (col: TransactionListSortKey) => {
    setSortState((s) =>
      s.sort === col
        ? { sort: col, dir: s.dir === "asc" ? "desc" : "asc" }
        : { sort: col, dir: defaultDirForSort() },
    );
    setPage(1);
  };

  const sortDirection = (
    col: TransactionListSortKey,
  ): "asc" | "desc" | "none" => {
    if (sort !== col) return "none";
    return dir;
  };

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

        <div className="min-h-0 flex-1 overflow-auto p-3">
          {listQuery.isLoading ? (
            <Table maxHeight="100%">
              <TableBody>
                {Array.from({ length: 5 }, (_, i) => (
                  <TableRow key={`drilldown-skel-${i}`}>
                    {Array.from({ length: 5 }, (_, j) => (
                      <TableCell key={`drilldown-skel-${i}-${j}`}>
                        <Skeleton className="h-4 w-full rounded-[var(--radius-sm)]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : listQuery.isError ? (
            <p className="p-1 text-sm text-destructive" role="alert">
              {queryErrorMessage(listQuery.error) ?? "Could not load transactions"}
            </p>
          ) : rows.length === 0 ? (
            <p className="p-1 text-sm text-muted">No transactions in this slice.</p>
          ) : (
            <Table className="min-w-[28rem]">
              <TableHeader>
                <TableRow>
                  <TableHead
                    freeze="leading"
                    aria-sort={tableSortAria(sortDirection("occurredAt"))}
                  >
                    <TableSortButton
                      direction={sortDirection("occurredAt")}
                      onClick={() => onSortHeader("occurredAt")}
                    >
                      Date
                    </TableSortButton>
                  </TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead
                    align="end"
                    aria-sort={tableSortAria(sortDirection("amountMinor"))}
                  >
                    <TableSortButton
                      align="end"
                      direction={sortDirection("amountMinor")}
                      onClick={() => onSortHeader("amountMinor")}
                    >
                      Amount
                    </TableSortButton>
                  </TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((tx) => (
                  <DrilldownRow
                    key={tx.id}
                    tx={tx}
                    accountById={accountById}
                    categoryById={categoryById}
                    currency={currency}
                    incomeAmountColor={incomeAmountColor}
                    formatDate={formatDate}
                  />
                ))}
              </TableBody>
            </Table>
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
}: {
  tx: MoneyTransactionListRow;
  accountById: Map<string, AnalyticsLookupAccount>;
  categoryById: Map<string, MoneyCategoryRow>;
  currency: string;
  incomeAmountColor: string;
  formatDate: (
    iso: string,
    opts?: {
      omitYear?: boolean;
      omitYearIfCurrent?: boolean;
      relativeDay?: boolean;
      shortYear?: boolean;
    },
  ) => string;
}) {
  const acc = accountById.get(tx.accountId);
  const cat = tx.categoryId ? categoryById.get(tx.categoryId) : null;
  const categoryLabel =
    cat != null ? moneyCategoryLabel(cat, categoryById) : "—";
  const amountLabel = formatMinor(tx.amountMinor, currency);

  return (
    <TableRow>
      <TableCell freeze="leading" className="whitespace-nowrap text-muted">
        {formatDate(tx.occurredAt, {
          omitYearIfCurrent: true,
          relativeDay: true,
          shortYear: true,
        })}
      </TableCell>
      <TableCell className="max-w-[8rem] truncate">{acc?.name ?? "—"}</TableCell>
      <TableCell className="max-w-[8rem] truncate">{categoryLabel}</TableCell>
      <TableCell
        align="end"
        numeric
        className="whitespace-nowrap"
        style={tx.kind === "income" ? { color: incomeAmountColor } : undefined}
      >
        {amountLabel}
      </TableCell>
      <TableCell className="max-w-[10rem] truncate text-muted">
        {truncateNote(tx.notes)}
      </TableCell>
    </TableRow>
  );
}
