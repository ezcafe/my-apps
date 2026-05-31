/** Maps direct category budget utilization and propagates child status to parents without a budget. */

export type CategoryBudgetStatusRow = {
  categoryId: string;
  progressPct: number;
};

export function buildCategoryBudgetStatusRows(
  directPctByCategoryId: Map<string, number>,
  parentIdByCategoryId: Map<string, string | null>,
): CategoryBudgetStatusRow[] {
  const effectivePct = new Map<string, number>();

  for (const [categoryId, pct] of directPctByCategoryId) {
    effectivePct.set(categoryId, pct);
    let parentId = parentIdByCategoryId.get(categoryId) ?? null;
    while (parentId) {
      if (directPctByCategoryId.has(parentId)) break;
      const prev = effectivePct.get(parentId) ?? 0;
      effectivePct.set(parentId, Math.max(prev, pct));
      parentId = parentIdByCategoryId.get(parentId) ?? null;
    }
  }

  return [...effectivePct.entries()].map(([categoryId, progressPct]) => ({
    categoryId,
    progressPct,
  }));
}
