/** Sentinel in categoryIds filters for transactions with no category. */
export const CATEGORY_FILTER_NONE = "__none__";

export function isCategoryFilterNone(id: string): boolean {
  return id === CATEGORY_FILTER_NONE;
}

export function splitCategoryFilterIds(categoryIds: string[] | undefined): {
  includeUncategorized: boolean;
  categoryUuids: string[];
} {
  if (!categoryIds?.length) {
    return { includeUncategorized: false, categoryUuids: [] };
  }
  const includeUncategorized = categoryIds.some(isCategoryFilterNone);
  const categoryUuids = categoryIds.filter((id) => !isCategoryFilterNone(id));
  return { includeUncategorized, categoryUuids };
}
