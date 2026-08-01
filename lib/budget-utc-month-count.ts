/**
 * Counts distinct UTC calendar months touched by [from, to] (inclusive of both endpoints' months).
 * Used to scale recurring monthly budget limits when analytics spans multiple months.
 */
export function utcDistinctMonthCountInclusive(from: Date, to: Date): number {
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) return 1;
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
  if (end < start) return 1;
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    count++;
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return Math.max(1, count);
}
