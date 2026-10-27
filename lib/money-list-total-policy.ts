/** List total / hasMore policy for moneyTransactions (Design Concept 2). */

export function pageRowsWithHasMore<T>(
  rows: readonly T[],
  pageSize: number,
): { data: T[]; hasMore: boolean } {
  if (rows.length > pageSize) {
    return { data: rows.slice(0, pageSize) as T[], hasMore: true };
  }
  return { data: [...rows] as T[], hasMore: false };
}

export function hasMoreFromExactTotal(
  page: number,
  pageSize: number,
  total: number,
): boolean {
  return page * pageSize < total;
}

export type FetchMoneyTransactionListPartsArgs<T> = {
  includeTotal: boolean;
  page: number;
  pageSize: number;
  runCount: () => Promise<number>;
  runRows: (limit: number) => Promise<T[]>;
};

export type FetchMoneyTransactionListPartsResult<T> = {
  data: T[];
  total: number | null;
  hasMore: boolean;
};

/**
 * Shared list-parts fetch: skip COUNT when includeTotal is false; hasMore from
 * pageSize+1 on skip-total, or page*pageSize < total when counting.
 */
export async function fetchMoneyTransactionListParts<T>(
  args: FetchMoneyTransactionListPartsArgs<T>,
): Promise<FetchMoneyTransactionListPartsResult<T>> {
  const { includeTotal, page, pageSize, runCount, runRows } = args;

  if (!includeTotal) {
    const probed = await runRows(pageSize + 1);
    const { data, hasMore } = pageRowsWithHasMore(probed, pageSize);
    return { data, total: null, hasMore };
  }

  const [total, rows] = await Promise.all([runCount(), runRows(pageSize)]);
  return {
    data: rows,
    total,
    hasMore: hasMoreFromExactTotal(page, pageSize, total),
  };
}
