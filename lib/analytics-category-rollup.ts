/** Top-N category rollup for stacked month charts. */

export type CategoryMonthRow = {
  month: string;
  categoryId: string | null;
  label: string;
  expenseMinor: number;
};

export type StackedMonthSeries = {
  month: string;
  series: { key: string; label: string; valueMinor: number }[];
};

const OTHER_KEY = "__other__";
const OTHER_LABEL = "Other";

export function rollupCategoryByMonth(
  rows: CategoryMonthRow[],
  topN = 6,
): StackedMonthSeries[] {
  const totalsByCategory = new Map<string, { label: string; total: number }>();
  for (const row of rows) {
    if (row.expenseMinor <= 0) continue;
    const key = row.categoryId ?? "uncategorized";
    const cur = totalsByCategory.get(key) ?? {
      label: row.label,
      total: 0,
    };
    cur.total += row.expenseMinor;
    totalsByCategory.set(key, cur);
  }

  const ranked = [...totalsByCategory.entries()].sort(
    (a, b) => b[1].total - a[1].total,
  );
  const topKeys = new Set(
    ranked.slice(0, topN).map(([key]) => key),
  );
  topKeys.add(OTHER_KEY);

  const byMonth = new Map<string, Map<string, number>>();
  const labelByKey = new Map<string, string>();
  labelByKey.set(OTHER_KEY, OTHER_LABEL);

  for (const row of rows) {
    if (row.expenseMinor <= 0) continue;
    const rawKey = row.categoryId ?? "uncategorized";
    const key = topKeys.has(rawKey) ? rawKey : OTHER_KEY;
    if (key !== OTHER_KEY) labelByKey.set(key, row.label);

    const monthMap = byMonth.get(row.month) ?? new Map<string, number>();
    monthMap.set(key, (monthMap.get(key) ?? 0) + row.expenseMinor);
    byMonth.set(row.month, monthMap);
  }

  const months = [...byMonth.keys()].sort();
  const seriesKeys = [
    ...ranked.slice(0, topN).map(([k]) => k),
    ...(ranked.length > topN ? [OTHER_KEY] : []),
  ];

  return months.map((month) => {
    const monthMap = byMonth.get(month) ?? new Map();
    return {
      month,
      series: seriesKeys.map((key) => ({
        key,
        label: labelByKey.get(key) ?? key,
        valueMinor: monthMap.get(key) ?? 0,
      })),
    };
  });
}
