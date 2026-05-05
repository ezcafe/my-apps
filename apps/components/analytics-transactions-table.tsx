"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AnalyticsLookupAccount,
  AnalyticsLookupMerchant,
} from "@/components/analytics-filters";
import { formatMinor } from "@/lib/format-money";
import { AnalyticsEmptyState } from "@/components/analytics-empty-state";
import { Alert } from "@/components/ui/alert";
import {
  moneyCategoryById,
  moneyCategoryLabel,
  type MoneyCategoryRow,
} from "@/lib/money-category-ui";
import { useInViewOnce } from "@/lib/use-in-view-once";
import type { TransactionListSortKey } from "@/lib/validators/money";

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
  merchants,
  deferFetchUntilVisible = true,
}: {
  filterQuery: string;
  activeWorkspaceId: string;
  accounts: AnalyticsLookupAccount[];
  categories: MoneyCategoryRow[];
  merchants: AnalyticsLookupMerchant[];
  /** When true, the transactions API runs only after this section intersects the viewport. */
  deferFetchUntilVisible?: boolean;
}) {
  const { ref: viewportRef, isInView } = useInViewOnce();
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
  const merchantById = useMemo(
    () => new Map(merchants.map((m) => [m.id, m])),
    [merchants],
  );

  const fetchList = useCallback(async () => {
    if (!activeWorkspaceId) return;
    if (deferFetchUntilVisible && !isInView) return;
    const qs = new URLSearchParams(filterQuery);
    qs.set("page", String(page));
    qs.set("pageSize", String(PAGE_SIZE));
    qs.set("sort", sort);
    qs.set("dir", dir);
    const q = qs.toString();
    const url = q.length > 0 ? `/api/money/transactions?${q}` : `/api/money/transactions?page=${page}&pageSize=${PAGE_SIZE}&sort=${sort}&dir=${dir}`;
    setLoading(true);
    setLocalError(null);
    try {
      const res = await fetch(url, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const body = (await res.json()) as {
        data?: TxRow[];
        total?: number;
        page?: number;
        pageSize?: number;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error ?? res.statusText);
      }
      setPayload({
        data: body.data ?? [],
        total: body.total ?? 0,
        page: body.page ?? page,
        pageSize: body.pageSize ?? PAGE_SIZE,
      });
    } catch (e: unknown) {
      setLocalError(e instanceof Error ? e.message : "Error");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [
    activeWorkspaceId,
    deferFetchUntilVisible,
    isInView,
    filterQuery,
    page,
    sort,
    dir,
  ]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const totalPages = useMemo(() => {
    if (!payload) return 1;
    return Math.max(1, Math.ceil(payload.total / payload.pageSize));
  }, [payload]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

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

  return (
    <section
      ref={viewportRef}
      className="col-span-2 w-full min-w-0 rounded-md border border-border bg-surface p-4 md:col-span-6 lg:col-span-12"
      aria-labelledby="analytics-transactions-heading"
    >
      <h2 id="analytics-transactions-heading" className="mb-3 text-lg font-medium">
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
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="min-w-full divide-y divide-border text-left text-sm">
          <caption className="sr-only">
            Filtered transactions with sorting and pagination
          </caption>
          <thead className="bg-[color-mix(in_oklab,var(--foreground)_4%,transparent)]">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-sm px-1 py-0.5 font-medium hover:bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)]"
                  onClick={() => onSortHeader("occurredAt")}
                  aria-sort={sortAria("occurredAt")}
                >
                  Date
                  {sort === "occurredAt" ? (dir === "asc" ? " ↑" : " ↓") : ""}
                </button>
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-sm px-1 py-0.5 font-medium hover:bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)]"
                  onClick={() => onSortHeader("kind")}
                  aria-sort={sortAria("kind")}
                >
                  Kind
                  {sort === "kind" ? (dir === "asc" ? " ↑" : " ↓") : ""}
                </button>
              </th>
              <th scope="col" className="px-3 py-2 font-medium text-right">
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-end gap-1 rounded-sm px-1 py-0.5 font-medium hover:bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)]"
                  onClick={() => onSortHeader("amountMinor")}
                  aria-sort={sortAria("amountMinor")}
                >
                  Amount
                  {sort === "amountMinor" ? (dir === "asc" ? " ↑" : " ↓") : ""}
                </button>
              </th>
              <th scope="col" className="hidden px-3 py-2 font-medium lg:table-cell">
                Account
              </th>
              <th scope="col" className="hidden px-3 py-2 font-medium md:table-cell">
                Category
              </th>
              <th scope="col" className="hidden px-3 py-2 font-medium xl:table-cell">
                Merchant
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
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted">
                  Scroll to load transactions for this filter range.
                </td>
              </tr>
            ) : null}
            {!awaitingViewport && loading && !payload ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-muted">
                  Loading transactions…
                </td>
              </tr>
            ) : null}
            {payload?.data.map((tx) => {
              const acc = accountById.get(tx.accountId);
              const currency = acc?.currency ?? "USD";
              const cat = tx.categoryId ? categoryById.get(tx.categoryId) : null;
              const categoryLabel =
                cat != null ? moneyCategoryLabel(cat, categoryById) : "—";
              const merchantLabel =
                tx.merchantId != null
                  ? (merchantById.get(tx.merchantId)?.name ?? "—")
                  : "—";

              return (
                <tr key={tx.id} className="hover:bg-[color-mix(in_oklab,var(--foreground)_4%,transparent)]">
                  <td className="whitespace-nowrap px-3 py-2 text-muted">
                    {new Date(tx.occurredAt).toLocaleString(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
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
                  <td className="hidden max-w-[10rem] truncate px-3 py-2 xl:table-cell">
                    {merchantLabel}
                  </td>
                  <td className="hidden max-w-[14rem] truncate px-3 py-2 text-muted lg:table-cell">
                    {truncateNote(tx.notes)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Link
                      href={`/money/transactions/${tx.id}`}
                      className="font-medium text-foreground underline-offset-2 hover:underline"
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
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1.5 font-medium hover:bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)] disabled:opacity-40"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1.5 font-medium hover:bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)] disabled:opacity-40"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
