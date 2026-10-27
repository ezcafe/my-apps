/** Pager helpers for moneyTransactions (exact total or hasMore-only). */

export type MoneyListPagerSlice = {
  page: number;
  pageSize: number;
  total: number | null;
  hasMore: boolean;
};

export function moneyListTotalPages(args: {
  total: number | null;
  pageSize: number;
}): number | null {
  if (args.total == null) return null;
  return Math.max(1, Math.ceil(args.total / args.pageSize));
}

export function moneyListCanPageNext(args: MoneyListPagerSlice): boolean {
  if (args.total == null) return args.hasMore;
  const totalPages = moneyListTotalPages(args);
  if (totalPages == null) return args.hasMore;
  return args.page < totalPages;
}

export function moneyListShowPager(args: {
  total: number | null;
  hasMore: boolean;
  rowCount: number;
}): boolean {
  if (args.total != null) return args.total > 0;
  return args.rowCount > 0 || args.hasMore;
}

export function moneyListPagerLabel(args: MoneyListPagerSlice): string {
  if (args.total == null) {
    return args.hasMore
      ? `Page ${args.page} · more available`
      : `Page ${args.page}`;
  }
  const totalPages = moneyListTotalPages(args) ?? 1;
  return `Page ${args.page} of ${totalPages} (${args.total.toLocaleString()} total)`;
}
