"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AnalyticsLookupAccount } from "@/components/analytics-filters";
import { colorByIndex } from "@/components/charts/chart-colors";
import { useTheme } from "@/components/theme-provider";
import { TransactionBulkEditModal } from "@/components/transaction-bulk-edit-modal";
import { TransactionSelectionBar } from "@/components/transaction-selection-bar";
import { formatMinor } from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import { AnalyticsEmptyState } from "@/components/analytics-empty-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/cn";
import { moneyGraphQLRequest } from "@/lib/gql-client";
import { MONEY_TRANSACTION_DELETE_MUTATION } from "@/lib/money-gql-documents";
import {
  moneyCategoryById,
  moneyCategoryLabel,
  type MoneyCategoryRow,
} from "@/lib/money-category-ui";
import {
  moneyRootQueryKey,
  moneyTransactionsQueryOptions,
  type MoneyTransactionListRow,
} from "@/lib/money-query-options";
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

function transactionEditHref(id: string, returnToPath: string) {
  const params = new URLSearchParams({ returnTo: returnToPath });
  return `/money/transactions/${id}?${params}`;
}

export function AnalyticsTransactionsTable({
  filterQuery,
  activeWorkspaceId,
  accounts,
  categories,
  tags = [],
  currency,
  deferFetchUntilVisible = true,
  variant = "analytics",
}: {
  filterQuery: string;
  activeWorkspaceId: string;
  accounts: AnalyticsLookupAccount[];
  categories: MoneyCategoryRow[];
  tags?: { id: string; name: string }[];
  currency: string;
  /** When true, the transactions API runs only after this section intersects the viewport. */
  deferFetchUntilVisible?: boolean;
  variant?: "analytics" | "standalone";
}) {
  const returnToPath =
    variant === "standalone" ? "/money/transactions" : "/money/analytics";

  const router = useRouter();
  const queryClient = useQueryClient();
  const selectable = variant === "standalone";
  const { ref: viewportRef, isInView } = useInViewOnce();
  const { formatDate } = useFormatDate();
  const { resolved, style } = useTheme();
  const incomeAmountColor = colorByIndex(resolved, 3, style);
  const [page, setPage] = useState(1);
  const [{ sort, dir }, setSortState] = useState<{
    sort: TransactionListSortKey;
    dir: "asc" | "desc";
  }>({ sort: "occurredAt", dir: "desc" });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const prevFilterRef = useRef(filterQuery);
  useEffect(() => {
    if (prevFilterRef.current !== filterQuery) {
      prevFilterRef.current = filterQuery;
      setPage(1);
      setSelectedIds(new Set());
    }
  }, [filterQuery]);

  const prevPageRef = useRef(page);
  useEffect(() => {
    if (prevPageRef.current !== page) {
      prevPageRef.current = page;
      setSelectedIds(new Set());
    }
  }, [page]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setActionError(null);
  }, []);

  const accountById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );
  const categoryById = useMemo(() => moneyCategoryById(categories), [categories]);
  const tagById = useMemo(
    () => new Map(tags.map((t) => [t.id, t])),
    [tags],
  );

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

  const effectivePage = Math.min(Math.max(page, 1), totalPages);
  if (effectivePage !== page) {
    setPage(effectivePage);
  }

  const pageRows = payload?.data ?? [];
  const pageIds = useMemo(() => pageRows.map((tx) => tx.id), [pageRows]);
  const selectedRows = useMemo(
    () => pageRows.filter((tx) => selectedIds.has(tx.id)),
    [pageRows, selectedIds],
  );
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected =
    !allPageSelected && pageIds.some((id) => selectedIds.has(id));

  const columnCount = 7;

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setActionError(null);
  }, []);

  const toggleAllOnPage = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
    setActionError(null);
  }, [allPageSelected, pageIds]);

  const handleEdit = useCallback(() => {
    if (selectedIds.size === 1) {
      const id = [...selectedIds][0];
      router.push(transactionEditHref(id, returnToPath));
      return;
    }
    if (selectedIds.size > 1) {
      setBulkEditOpen(true);
    }
  }, [router, selectedIds, returnToPath]);

  const handleDelete = useCallback(async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (
      !window.confirm(
        `Delete ${count} transaction${count === 1 ? "" : "s"}? This cannot be undone.`,
      )
    ) {
      return;
    }

    setActionBusy(true);
    setActionError(null);
    try {
      const ids = [...selectedIds];
      const results = await Promise.allSettled(
        ids.map((id) =>
          moneyGraphQLRequest(MONEY_TRANSACTION_DELETE_MUTATION, { id }),
        ),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      await queryClient.invalidateQueries({ queryKey: moneyRootQueryKey });
      clearSelection();

      if (failed > 0) {
        setActionError(
          failed === ids.length
            ? "Couldn’t delete transactions."
            : `Deleted ${ids.length - failed} of ${ids.length}; ${failed} failed.`,
        );
      }
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Error");
    } finally {
      setActionBusy(false);
    }
  }, [clearSelection, queryClient, selectedIds]);

  const onBulkEditSuccess = useCallback(() => {
    clearSelection();
    setBulkEditOpen(false);
  }, [clearSelection]);

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

  const awaitingViewport = deferFetchUntilVisible && !isInView;

  const showTransactionsEmpty =
    !awaitingViewport &&
    !loading &&
    payload != null &&
    payload.total === 0;

  const sortIndicator = (col: TransactionListSortKey) =>
    sort === col ? (dir === "asc" ? " ↑" : " ↓") : "";

  function renderRow(tx: MoneyTransactionListRow) {
    const acc = accountById.get(tx.accountId);
    const cat = tx.categoryId ? categoryById.get(tx.categoryId) : null;
    const categoryLabel =
      cat != null ? moneyCategoryLabel(cat, categoryById) : "—";
    const amountLabel = formatMinor(tx.amountMinor, currency);
    const dateLabel = formatDate(tx.occurredAt, { omitYear: true });
    const isSelected = selectedIds.has(tx.id);

    return (
      <tr
        key={tx.id}
        className={cn(
          "transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--foreground)_4%,transparent)]",
          isSelected &&
            "bg-[color-mix(in_oklab,var(--accent)_8%,transparent)]",
        )}
      >
        {selectable ? (
          <td className="w-10 px-3 py-2">
            <Checkbox
              checked={isSelected}
              onChange={() => toggleRow(tx.id)}
              ariaLabel={`Select transaction ${dateLabel}, ${amountLabel}`}
            />
          </td>
        ) : null}
        <td className="whitespace-nowrap px-3 py-2 text-muted">{dateLabel}</td>
        <td className="max-w-[10rem] truncate px-3 py-2">{acc?.name ?? "—"}</td>
        <td className="max-w-[10rem] truncate px-3 py-2">{categoryLabel}</td>
        <td className="max-w-[12rem] px-3 py-2">
          {tx.tagIds.length === 0 ? (
            <span className="text-muted">—</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {tx.tagIds.map((tagId) => {
                const tag = tagById.get(tagId);
                if (!tag) return null;
                return <Tag key={tagId}>{tag.name}</Tag>;
              })}
            </div>
          )}
        </td>
        <td
          className="whitespace-nowrap px-3 py-2 text-right tabular-nums"
          style={
            tx.kind === "income" ? { color: incomeAmountColor } : undefined
          }
        >
          {amountLabel}
        </td>
        <td className="max-w-[14rem] truncate px-3 py-2 text-muted">
          {truncateNote(tx.notes)}
        </td>
        {!selectable ? (
          <td className="whitespace-nowrap px-3 py-2">
            <Link
              href={transactionEditHref(tx.id, returnToPath)}
              className="font-medium text-foreground underline-offset-2 transition-colors duration-150 hover:underline"
            >
              Edit
            </Link>
          </td>
        ) : null}
      </tr>
    );
  }

  return (
    <>
      <Card
        ref={viewportRef}
        className="col-span-2 w-full min-w-0 p-4 md:col-span-6 lg:col-span-12"
      >
        <section aria-labelledby="analytics-transactions-heading">
          <h2
            id="analytics-transactions-heading"
            className="mb-3 font-display text-lg font-medium"
          >
            Transactions
          </h2>
          <p className="mb-3 text-xs text-muted">
            {variant === "standalone"
              ? "Select rows to edit or delete. Filter by date, account, category, and more."
              : "Rows match the applied analytics filters. Sort columns or change page below."}
          </p>

          {localError ? (
            <Alert
              variant="error"
              title="Couldn’t load transactions"
              description={localError}
            />
          ) : null}

          {actionError ? (
            <Alert
              variant="error"
              title="Action failed"
              description={actionError}
              className="mb-3"
            />
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
                    {selectable ? (
                      <th scope="col" className="w-10 px-3 py-2">
                        <Checkbox
                          checked={allPageSelected}
                          indeterminate={somePageSelected}
                          onChange={toggleAllOnPage}
                          ariaLabel="Select all transactions on this page"
                        />
                      </th>
                    ) : null}
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
                    <th scope="col" className="px-3 py-2 font-medium">
                      Tags
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
                    {!selectable ? (
                      <th scope="col" className="px-3 py-2 font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {awaitingViewport ? (
                    <tr>
                      <td
                        colSpan={columnCount}
                        className="px-3 py-8 text-center text-sm text-muted"
                      >
                        Scroll to load transactions for this filter range.
                      </td>
                    </tr>
                  ) : null}
                  {!awaitingViewport && loading && !payload ? (
                    <tr>
                      <td
                        colSpan={columnCount}
                        className="px-3 py-6 text-center text-muted"
                      >
                        Loading transactions…
                      </td>
                    </tr>
                  ) : null}
                  {pageRows.map(renderRow)}
                </tbody>
              </table>
            </div>
          )}

          {payload && payload.total > 0 ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="text-muted">
                Page {payload.page} of {totalPages} (
                {payload.total.toLocaleString()} total)
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

      {selectable ? (
        <>
          <TransactionSelectionBar
            selectedCount={selectedIds.size}
            busy={actionBusy}
            onEdit={handleEdit}
            onDelete={() => void handleDelete()}
            onClear={clearSelection}
          />
          <TransactionBulkEditModal
            open={bulkEditOpen}
            activeWorkspaceId={activeWorkspaceId}
            selectedRows={selectedRows}
            accounts={accounts}
            categories={categories}
            tags={tags}
            onClose={() => setBulkEditOpen(false)}
            onSuccess={onBulkEditSuccess}
          />
        </>
      ) : null}
    </>
  );
}
