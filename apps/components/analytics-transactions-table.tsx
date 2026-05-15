"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AnalyticsLookupAccount,
} from "@/components/analytics-filters";
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
import { moneyGraphQLRequest } from "@/lib/gql-client";
import { MONEY_TRANSACTIONS_QUERY } from "@/lib/money-gql-documents";
import { useInViewOnce } from "@/lib/use-in-view-once";
import type { TransactionListSortKey } from "@/lib/validators/money";

function transactionListQueryObject(
  filterQuery: string,
  page: number,
  pageSize: number,
  sort: TransactionListSortKey,
  dir: "asc" | "desc",
): Record<string, unknown> {
  const u = new URLSearchParams(filterQuery);
  const out: Record<string, unknown> = {
    page,
    pageSize,
    sort,
    dir,
  };
  const from = u.get("from");
  const to = u.get("to");
  if (from) out.from = from;
  if (to) out.to = to;
  for (const key of [
    "accountIds",
    "categoryIds",
    "merchantIds",
    "tagIds",
    "kinds",
  ] as const) {
    const all = u.getAll(key);
    if (all.length) out[key] = all;
  }
  return out;
}

const PAGE_SIZE = 20;

type TxRow = {
  id: string;
  accountId: string;
  kind: "expense" | "income" | "transfer";
  amountMinor: number;
  occurredAt: string;
  categoryId: string | null;
  merchantId: string | null;
  notes: string | null;
  tagIds: string[];
};

type ListResponse = {
  data: TxRow[];
  total: number;
  page: number;
  pageSize: number;
};

function defaultDirForSort(sort: TransactionListSortKey): "asc" | "desc" {
  return sort === "kind" ? "asc" : "desc";
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
}: {
  filterQuery: string;
  activeWorkspaceId: string;
  accounts: AnalyticsLookupAccount[];
  categories: MoneyCategoryRow[];
  currency: string;
  /** When true, the transactions API runs only after this section intersects the viewport. */
  deferFetchUntilVisible?: boolean;
}) {
  const { ref: viewportRef, isInView } = useInViewOnce();
  const { formatDateTime } = useFormatDate();
  const [page, setPage] = useState(1);
  const [{ sort, dir }, setSortState] = useState<{
    sort: TransactionListSortKey;
    dir: "asc" | "desc";
  }>({ sort: "occurredAt", dir: "desc" });

  const [payload, setPayload] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!activeWorkspaceId) return;
    if (deferFetchUntilVisible && !isInView) return;
    let cancelled = false;
    const queryObj = transactionListQueryObject(
      filterQuery,
      page,
      PAGE_SIZE,
      sort,
      dir,
    );
    queueMicrotask(() => {
      if (cancelled) return;
      void (async () => {
        setLoading(true);
        setLocalError(null);
        try {
          const body = await moneyGraphQLRequest<{
            moneyTransactions: ListResponse;
          }>(MONEY_TRANSACTIONS_QUERY, { query: queryObj });
          if (cancelled) return;
          const chunk = body.moneyTransactions;
          setPayload({
            data: (chunk.data ?? []) as TxRow[],
            total: chunk.total ?? 0,
            page: chunk.page ?? page,
            pageSize: chunk.pageSize ?? PAGE_SIZE,
          });
        } catch (e: unknown) {
          if (cancelled) return;
          setLocalError(e instanceof Error ? e.message : "Error");
          setPayload(null);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [
    activeWorkspaceId,
    deferFetchUntilVisible,
    isInView,
    filterQuery,
    page,
    sort,
    dir,
  ]);

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
        : { sort: col, dir: defaultDirForSort(col) },
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
        Rows match the applied analytics filters. Sort columns or change page below.
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
          action={{ href: "/money", label: "Go to transactions" }}
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
              <th
                scope="col"
                className="px-3 py-2 font-medium"
                aria-sort={sortAria("kind")}
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1 py-0.5 font-medium transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] fx-press"
                  onClick={() => onSortHeader("kind")}
                >
                  Kind
                  {sortIndicator("kind")}
                </button>
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
              <th scope="col" className="hidden px-3 py-2 font-medium lg:table-cell">
                Account
              </th>
              <th scope="col" className="hidden px-3 py-2 font-medium md:table-cell">
                Category
              </th>
              <th scope="col" className="hidden px-3 py-2 font-medium lg:table-cell">
                Notes
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {awaitingViewport ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted">
                  Scroll to load transactions for this filter range.
                </td>
              </tr>
            ) : null}
            {!awaitingViewport && loading && !payload ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted">
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
                    {formatDateTime(tx.occurredAt)}
                  </td>
                  <td className="px-3 py-2 capitalize">{tx.kind}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {formatMinor(tx.amountMinor, currency)}
                  </td>
                  <td className="hidden max-w-[10rem] truncate px-3 py-2 lg:table-cell">
                    {acc?.name ?? "—"}
                  </td>
                  <td className="hidden max-w-[10rem] truncate px-3 py-2 md:table-cell">
                    {categoryLabel}
                  </td>
                  <td className="hidden max-w-[14rem] truncate px-3 py-2 text-muted lg:table-cell">
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
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page >= totalPages || loading}
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
