"use client";

import { presentClientError, queryErrorMessage } from "@/lib/user-facing-error";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AnalyticsLookupAccount } from "@/components/analytics-filters";
import { colorByIndex } from "@/components/charts/chart-colors";
import { useTheme } from "@/components/theme-provider";
import { TransactionEditModal } from "@/components/transaction-edit-modal";
import { TransactionSelectionBar } from "@/components/transaction-selection-bar";
import { formatMinor } from "@/lib/format-money";
import { useFormatDate } from "@/lib/format-date";
import { AnalyticsEmptyState } from "@/components/analytics-empty-state";
import { MoneyListSkeleton } from "@/components/money-feedback";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowActions,
  TableSortButton,
  tableSortAria,
} from "@/components/ui/table";
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
import type { MoneyLedgerEmptyState } from "@/lib/money-ledger-presets";
import { useInViewOnce } from "@/lib/use-in-view-once";
import type { TransactionListSortKey } from "@/lib/validators/money";
import dynamic from "next/dynamic";

const TransactionBulkEditModal = dynamic(
  () =>
    import("@/components/transaction-bulk-edit-modal").then((m) => ({
      default: m.TransactionBulkEditModal,
    })),
  { ssr: false },
);

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
  tags = [],
  currency,
  deferFetchUntilVisible = true,
  variant = "analytics",
  emptyState,
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
  emptyState?: MoneyLedgerEmptyState;
}) {
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
  const [editTransactionId, setEditTransactionId] = useState<string | null>(
    null,
  );
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
  const localError = queryErrorMessage(transactionsQuery.error);

  const totalPages = useMemo(() => {
    if (!payload) return 1;
    return Math.max(1, Math.ceil(payload.total / payload.pageSize));
  }, [payload]);

  const effectivePage = Math.min(Math.max(page, 1), totalPages);
  if (effectivePage !== page) {
    setPage(effectivePage);
  }

  const pageRows = useMemo(() => payload?.data ?? [], [payload?.data]);
  const pageIds = useMemo(() => pageRows.map((tx) => tx.id), [pageRows]);
  const selectedRows = useMemo(
    () => pageRows.filter((tx) => selectedIds.has(tx.id)),
    [pageRows, selectedIds],
  );
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected =
    !allPageSelected && pageIds.some((id) => selectedIds.has(id));

  const columnCount = selectable ? 7 : 5;

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
      setEditTransactionId(id);
      return;
    }
    if (selectedIds.size > 1) {
      setBulkEditOpen(true);
    }
  }, [selectedIds]);

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
      setActionError(presentClientError("analytics-transactions-table", e));
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

  const sortDirection = (
    col: TransactionListSortKey,
  ): "asc" | "desc" | "none" => {
    if (sort !== col) return "none";
    return dir;
  };

  if (!activeWorkspaceId) return null;

  const awaitingViewport = deferFetchUntilVisible && !isInView;

  const showTransactionsEmpty =
    !awaitingViewport &&
    !loading &&
    payload != null &&
    payload.total === 0;

  function renderRow(tx: MoneyTransactionListRow) {
    const acc = accountById.get(tx.accountId);
    const cat = tx.categoryId ? categoryById.get(tx.categoryId) : null;
    const categoryLabel =
      cat != null ? moneyCategoryLabel(cat, categoryById) : "—";
    const amountLabel = formatMinor(tx.amountMinor, currency);
    const dateLabel = formatDate(tx.occurredAt, {
      omitYearIfCurrent: true,
      relativeDay: true,
      shortYear: true,
    });
    const isSelected = selectedIds.has(tx.id);
    const dateFreeze = selectable ? "afterCheckbox" : "leading";

    return (
      <TableRow key={tx.id} selected={isSelected}>
        {selectable ? (
          <TableCell freeze="leading" className="w-10">
            <Checkbox
              checked={isSelected}
              onChange={() => toggleRow(tx.id)}
              ariaLabel={`Select transaction ${dateLabel}, ${amountLabel}`}
            />
          </TableCell>
        ) : null}
        <TableCell
          freeze={dateFreeze}
          className="whitespace-nowrap text-muted"
        >
          {dateLabel}
        </TableCell>
        <TableCell className="max-w-[10rem] truncate">
          {acc?.name ?? "—"}
        </TableCell>
        <TableCell className="max-w-[10rem]">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="truncate">{categoryLabel}</span>
            {tx.excludeFromAnalyticsAndBudget ? (
              <Tag className="shrink-0 text-muted">Excluded</Tag>
            ) : null}
          </div>
        </TableCell>
        <TableCell
          align="end"
          numeric
          className="whitespace-nowrap"
          style={
            tx.kind === "income" ? { color: incomeAmountColor } : undefined
          }
        >
          {amountLabel}
        </TableCell>
        <TableCell className="max-w-[14rem] truncate text-muted">
          {truncateNote(tx.notes)}
        </TableCell>
        {selectable ? (
          <TableCell>
            <TableRowActions>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditTransactionId(tx.id)}
              >
                Edit
              </Button>
            </TableRowActions>
          </TableCell>
        ) : null}
      </TableRow>
    );
  }

  function renderMobileCard(tx: MoneyTransactionListRow) {
    const acc = accountById.get(tx.accountId);
    const cat = tx.categoryId ? categoryById.get(tx.categoryId) : null;
    const categoryLabel =
      cat != null ? moneyCategoryLabel(cat, categoryById) : "—";
    const amountLabel = formatMinor(tx.amountMinor, currency);
    const dateLabel = formatDate(tx.occurredAt, {
      omitYearIfCurrent: true,
      relativeDay: true,
      shortYear: true,
    });
    const noteLabel = truncateNote(tx.notes);
    const isSelected = selectedIds.has(tx.id);

    return (
      <div
        key={tx.id}
        className={cn(
          "flex min-h-12 items-start gap-3 rounded-[var(--radius-sm)] border border-border bg-surface px-4 py-3 transition-colors duration-150",
          isSelected &&
            "border-accent/40 bg-[color-mix(in_oklab,var(--accent)_8%,transparent)]",
        )}
      >
        {selectable ? (
          <div className="shrink-0 pt-0.5">
            <Checkbox
              checked={isSelected}
              onChange={() => toggleRow(tx.id)}
              ariaLabel={`Select transaction ${dateLabel}, ${amountLabel}`}
            />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium tabular-nums">{amountLabel}</p>
              <p className="mt-0.5 truncate text-base text-muted">
                {acc?.name ?? "—"}
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted tabular-nums">
              {dateLabel}
            </span>
          </div>
          <p className="mt-1 truncate text-base">{categoryLabel}</p>
          {noteLabel !== "—" ? (
            <p className="mt-1 truncate text-base text-muted">{noteLabel}</p>
          ) : null}
          {selectable ? (
            <div className="mt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditTransactionId(tx.id)}
              >
                Edit
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  function renderTableLoadingBody() {
    return (
      <>
        {Array.from({ length: 6 }, (_, rowIndex) => (
          <TableRow key={`tx-skel-${rowIndex}`}>
            {Array.from({ length: columnCount }, (_, colIndex) => (
              <TableCell key={`tx-skel-${rowIndex}-${colIndex}`}>
                <Skeleton className="h-4 w-full rounded-[var(--radius-sm)]" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </>
    );
  }

  const defaultEmptyState = {
    icon: "table" as const,
    title: "No transactions for this view",
    description: "Adjust filters or add transactions on the ledger.",
    action:
      variant === "standalone"
        ? { href: "/money/new", label: "Add transaction" }
        : { href: "/money/spending", label: "View transactions" },
  };

  const resolvedEmpty = emptyState
    ? {
        icon: emptyState.icon,
        title: emptyState.title,
        description: emptyState.description,
        accentChartIndex: emptyState.accentChartIndex,
        primaryAction: emptyState.primaryAction,
        secondaryAction: emptyState.secondaryAction,
      }
    : {
        icon: defaultEmptyState.icon,
        title: defaultEmptyState.title,
        description: defaultEmptyState.description,
        accentChartIndex: undefined as number | undefined,
        primaryAction:
          variant === "standalone"
            ? { href: "/money/new", label: "Add transaction" }
            : undefined,
        secondaryAction:
          variant === "analytics"
            ? { href: "/money/spending", label: "Open spending ledger" }
            : undefined,
      };

  const showLoadingList = !awaitingViewport && loading && !payload;
  const showDataList = !awaitingViewport && !showLoadingList;

  return (
    <>
      <div
        ref={viewportRef}
        role="region"
        aria-labelledby="analytics-transactions-heading"
        className="@container w-full min-w-0"
      >
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
              icon={resolvedEmpty.icon}
              title={resolvedEmpty.title}
              description={resolvedEmpty.description}
              accentChartIndex={resolvedEmpty.accentChartIndex}
              primaryAction={resolvedEmpty.primaryAction}
              secondaryAction={resolvedEmpty.secondaryAction}
              minHeightClass="min-h-[220px]"
            />
          ) : (
            <>
              {awaitingViewport ? (
                <p className="rounded-[var(--radius-md)] border border-border px-3 py-6 text-center text-base text-muted">
                  Scroll to load transactions for this filter range.
                </p>
              ) : null}

              {showLoadingList ? (
                <>
                  <div className="hidden @md:block">
                    <Table>
                      <TableBody>{renderTableLoadingBody()}</TableBody>
                    </Table>
                  </div>
                  <div className="rounded-[var(--radius-md)] border border-border p-3 @md:hidden">
                    <MoneyListSkeleton variant="tableRows" />
                  </div>
                </>
              ) : null}

              {showDataList ? (
                <>
                  <div className="hidden @md:block">
                    <Table>
                      <TableCaption>
                        Filtered transactions with sorting and pagination
                      </TableCaption>
                      <TableHeader>
                        <TableRow>
                          {selectable ? (
                            <TableHead freeze="leading" className="w-10">
                              <Checkbox
                                checked={allPageSelected}
                                indeterminate={somePageSelected}
                                onChange={toggleAllOnPage}
                                ariaLabel="Select all transactions on this page"
                              />
                            </TableHead>
                          ) : null}
                          <TableHead
                            freeze={selectable ? "afterCheckbox" : "leading"}
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
                            aria-sort={tableSortAria(
                              sortDirection("amountMinor"),
                            )}
                          >
                            <TableSortButton
                              align="end"
                              direction={sortDirection("amountMinor")}
                              onClick={() => onSortHeader("amountMinor")}
                            >
                              Amount
                            </TableSortButton>
                          </TableHead>
                          <TableHead>Note</TableHead>
                          {selectable ? (
                            <TableHead>
                              <span className="sr-only">Actions</span>
                            </TableHead>
                          ) : null}
                        </TableRow>
                      </TableHeader>
                      <TableBody>{pageRows.map(renderRow)}</TableBody>
                    </Table>
                  </div>
                  <div className="space-y-2 @md:hidden">
                    {pageRows.map(renderMobileCard)}
                  </div>
                </>
              ) : null}
            </>
          )}

          {payload && payload.total > 0 ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-base">
              <p className="text-muted">
                Page {payload.page} of {totalPages} (
                {payload.total.toLocaleString()} total)
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page <= 1 || fetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page >= totalPages || fetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
      </div>

      {selectable ? (
        <>
          <TransactionSelectionBar
            selectedCount={selectedIds.size}
            busy={actionBusy}
            onEdit={handleEdit}
            onDelete={() => void handleDelete()}
            onClear={clearSelection}
          />
          {bulkEditOpen ? (
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
          ) : null}
        </>
      ) : null}

      <TransactionEditModal
        open={editTransactionId != null}
        transactionId={editTransactionId}
        onClose={() => setEditTransactionId(null)}
        onSaved={() => {
          clearSelection();
        }}
      />
    </>
  );
}
