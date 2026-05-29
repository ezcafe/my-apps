"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  AnalyticsLookupAccount,
} from "@/components/analytics-filters";
import { colorByIndex } from "@/components/charts/chart-colors";
import { useTheme } from "@/components/theme-provider";
import { formatMinor } from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import { AnalyticsEmptyState } from "@/components/analytics-empty-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  moneyCategoryById,
  moneyCategoryLabel,
  type MoneyCategoryRow,
} from "@/lib/money-category-ui";
import { moneyTransactionsQueryOptions } from "@/lib/money-query-options";
import { useInViewOnce } from "@/lib/use-in-view-once";
import type { TransactionListSortKey } from "@/lib/validators/money";

const PAGE_SIZE = 20;

function defaultDirForSort(): "asc" | "desc" {
  return "desc";
}

function truncateNote(s: string | null, max = 72): string {
  if (s == null || s === "") return "—";
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function AnalyticsTransactionsTable({
  filterQuery,
  activeWorkspaceId,
  accounts,
  categories,
  currency,
  deferFetchUntilVisible = true,
  variant = "analytics",
}: {
  filterQuery: string;
  activeWorkspaceId: string;
  accounts: AnalyticsLookupAccount[];
  categories: MoneyCategoryRow[];
  currency: string;
  /** When true, the transactions API runs only after this section intersects the viewport. */
  deferFetchUntilVisible?: boolean;
  variant?: "analytics" | "standalone";
}) {
  const { ref: viewportRef, isInView } = useInViewOnce();
  const { formatDate } = useFormatDate();
  const { resolved, style } = useTheme();
  const incomeAmountColor = colorByIndex(resolved, 3, style);
  const [page, setPage] = useState(1);
  const [{ sort, dir }, setSortState] = useState<{
    sort: TransactionListSortKey;
    dir: "asc" | "desc";
  }>({ sort: "occurredAt", dir: "desc" });

  const prevFilterRef = useRef(filterQuery);
  useEffect(() => {
    if (prevFilterRef.current !== filterQuery) {
      prevFilterRef.current = filterQuery;
      setPage(1);
    }
  }, [filterQuery]);

  const accountById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );
  const categoryById = useMemo(() => moneyCategoryById(categories), [categories]);

  const transactionsQuery = useQuery({
    ...moneyTransactionsQueryOptions(
      activeWorkspaceId,
      filterQuery,
      page,
      PAGE_SIZE,
      sort,
      dir,
    ),
    enabled:
      Boolean(activeWorkspaceId) &&
      (!deferFetchUntilVisible || isInView),
  });
  const payload = transactionsQuery.data ?? null;
  const loading = transactionsQuery.isLoading;
  const fetching = transactionsQuery.isFetching;
  const localError =
    transactionsQuery.error instanceof Error
      ? transactionsQuery.error.message
      : null;

  const totalPages = useMemo(() => {
    if (!payload) return 1;
    return Math.max(1, Math.ceil(payload.total / payload.pageSize));
  }, [payload]);

  // Clamp the page during render rather than reacting in an effect: keeps
  // navigation bounded if the visible total shrinks (e.g., filter narrows).
  const effectivePage = Math.min(Math.max(page, 1), totalPages);
  if (effectivePage !== page) {
    setPage(effectivePage);
  }

  const onSortHeader = (col: TransactionListSortKey) => {
    setSortState((s) =>
      s.sort === col
        ? { sort: col, dir: s.dir === "asc" ? "desc" : "asc" }
        : { sort: col, dir: defaultDirForSort() },
    );
    setPage(1);
  };

  const sortAria = (col: TransactionListSortKey): "ascending" | "descending" | "none" => {
    if (sort !== col) return "none";
    return dir === "asc" ? "ascending" : "descending";
  };

  if (!activeWorkspaceId) return null;

  const awaitingViewport =
    deferFetchUntilVisible && !isInView;

  const showTransactionsEmpty =
    !awaitingViewport &&
    !loading &&
    payload != null &&
    payload.total === 0;

  const sortIndicator = (col: TransactionListSortKey) =>
    sort === col ? (dir === "asc" ? " ↑" : " ↓") : "";

  return (
    <Card
      ref={viewportRef}
      className="col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12"
    >
      <section aria-labelledby="analytics-transactions-heading">
      <h2 id="analytics-transactions-heading" className="mb-3 font-display text-lg font-medium">
        Transactions
      </h2>
      <p className="mb-3 text-xs text-muted">
        {variant === "standalone"
          ? "Filter by date, account, category, and more. Sort columns or change page below."
          : "Rows match the applied analytics filters. Sort columns or change page below."}
      </p>

      {localError ? (
        <Alert variant="error" title="Couldn’t load transactions" description={localError} />
      ) : null}

      {showTransactionsEmpty ? (
        <AnalyticsEmptyState
          icon="table"
          title="No transactions for this view"
          description="Adjust filters or add transactions on the ledger."
          minHeightClass="min-h-[220px]"
          action={
            variant === "standalone"
              ? { href: "/money", label: "Add transaction" }
              : { href: "/money/transactions", label: "View transactions" }
          }
        />
      ) : (
      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
        <table className="min-w-full divide-y divide-border text-left text-sm">
          <caption className="sr-only">
            Filtered transactions with sorting and pagination
          </caption>
          <thead className="bg-muted-surface">
            <tr>
              <th
                scope="col"
                className="px-3 py-2 font-medium"
                aria-sort={sortAria("occurredAt")}
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1 py-0.5 font-medium transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] fx-press"
                  onClick={() => onSortHeader("occurredAt")}
                >
                  Date
                  {sortIndicator("occurredAt")}
                </button>
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Account
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Category
              </th>
              <th
                scope="col"
                className="px-3 py-2 font-medium text-right"
                aria-sort={sortAria("amountMinor")}
              >
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-end gap-1 rounded-[var(--radius-sm)] px-1 py-0.5 font-medium transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] fx-press"
                  onClick={() => onSortHeader("amountMinor")}
                >
                  Amount
                  {sortIndicator("amountMinor")}
                </button>
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Note
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {awaitingViewport ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted">
                  Scroll to load transactions for this filter range.
                </td>
              </tr>
            ) : null}
            {!awaitingViewport && loading && !payload ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted">
                  Loading transactions…
                </td>
              </tr>
            ) : null}
            {payload?.data.map((tx) => {
              const acc = accountById.get(tx.accountId);
              const cat = tx.categoryId ? categoryById.get(tx.categoryId) : null;
              const categoryLabel =
                cat != null ? moneyCategoryLabel(cat, categoryById) : "—";

              return (
                <tr
                  key={tx.id}
                  className="transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--foreground)_4%,transparent)]"
                >
                  <td className="whitespace-nowrap px-3 py-2 text-muted">
                    {formatDate(tx.occurredAt, { omitYear: true })}
                  </td>
                  <td className="max-w-[10rem] truncate px-3 py-2">
                    {acc?.name ?? "—"}
                  </td>
                  <td className="max-w-[10rem] truncate px-3 py-2">
                    {categoryLabel}
                  </td>
                  <td
                    className="whitespace-nowrap px-3 py-2 text-right tabular-nums"
                    style={
                      tx.kind === "income"
                        ? { color: incomeAmountColor }
                        : undefined
                    }
                  >
                    {formatMinor(tx.amountMinor, currency)}
                  </td>
                  <td className="max-w-[14rem] truncate px-3 py-2 text-muted">
                    {truncateNote(tx.notes)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Link
                      href={`/money/transactions/${tx.id}`}
                      className="font-medium text-foreground underline-offset-2 transition-colors duration-150 hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {payload && payload.total > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-muted">
            Page {payload.page} of {totalPages} ({payload.total.toLocaleString()} total)
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page <= 1 || fetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page >= totalPages || fetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
      </section>
    </Card>
  );
}
