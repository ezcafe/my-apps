/** Top-N category rollup for stacked month charts and pie/sankey payloads. */

export const ANALYTICS_OTHER_KEY = "__other__";
export const ANALYTICS_OTHER_LABEL = "Other";
export const ANALYTICS_PIE_TOP_N = 8;
export const ANALYTICS_SANKEY_TOP_N = 10;

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

export type PieRollupRow = {
  categoryId: string | null;
  label: string;
  valueMinor: number;
};

export type SankeyInputRollupRow = {
  kind: "income" | "expense";
  categoryId: string | null;
  valueMinor: number;
};

export function isAnalyticsOtherCategoryId(
  categoryId: string | null | undefined,
): boolean {
  return categoryId === ANALYTICS_OTHER_KEY;
}

/** Keep top-N pie slices by value; bucket the rest as Other. Totals are conserved. */
export function rollupPieRows(
  rows: PieRollupRow[],
  topN = ANALYTICS_PIE_TOP_N,
): PieRollupRow[] {
  const ranked = rows
    .filter((row) => row.valueMinor > 0)
    .toSorted((a, b) => b.valueMinor - a.valueMinor);
  if (ranked.length <= topN) return ranked;
  const top = ranked.slice(0, topN);
  const otherMinor = ranked
    .slice(topN)
    .reduce((sum, row) => sum + row.valueMinor, 0);
  return [
    ...top,
    {
      categoryId: ANALYTICS_OTHER_KEY,
      label: ANALYTICS_OTHER_LABEL,
      valueMinor: otherMinor,
    },
  ];
}

/** Remap categories outside the top-N flow totals onto the Other sentinel. */
export function rollupSankeyInputRows(
  rows: SankeyInputRollupRow[],
  topN = ANALYTICS_SANKEY_TOP_N,
): SankeyInputRollupRow[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (row.valueMinor <= 0) continue;
    const key = row.categoryId ?? "uncategorized";
    totals.set(key, (totals.get(key) ?? 0) + row.valueMinor);
  }
  if (totals.size <= topN) return rows;
  const topKeys = new Set(
    [...totals.entries()]
      .toSorted((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([key]) => key),
  );
  return rows.map((row) => {
    if (row.valueMinor <= 0) return row;
    const key = row.categoryId ?? "uncategorized";
    if (topKeys.has(key)) return row;
    return { ...row, categoryId: ANALYTICS_OTHER_KEY };
  });
}

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

  const ranked = [...totalsByCategory.entries()].toSorted(
    (a, b) => b[1].total - a[1].total,
  );
  const topKeys = new Set(
    ranked.slice(0, topN).map(([key]) => key),
  );
  topKeys.add(ANALYTICS_OTHER_KEY);

  const byMonth = new Map<string, Map<string, number>>();
  const labelByKey = new Map<string, string>();
  labelByKey.set(ANALYTICS_OTHER_KEY, ANALYTICS_OTHER_LABEL);

  for (const row of rows) {
    if (row.expenseMinor <= 0) continue;
    const rawKey = row.categoryId ?? "uncategorized";
    const key = topKeys.has(rawKey) ? rawKey : ANALYTICS_OTHER_KEY;
    if (key !== ANALYTICS_OTHER_KEY) labelByKey.set(key, row.label);

    const monthMap = byMonth.get(row.month) ?? new Map<string, number>();
    monthMap.set(key, (monthMap.get(key) ?? 0) + row.expenseMinor);
    byMonth.set(row.month, monthMap);
  }

  const months = [...byMonth.keys()].sort();
  const seriesKeys = [
    ...ranked.slice(0, topN).map(([k]) => k),
    ...(ranked.length > topN ? [ANALYTICS_OTHER_KEY] : []),
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
