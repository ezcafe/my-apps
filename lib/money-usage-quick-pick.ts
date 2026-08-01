export type UsageRankedItem = {
  id: string;
  label: string;
  usageCount?: number;
  /** Indented row in the full picker list (e.g. child categories). */
  isChild?: boolean;
};

export function usageOrZero(item: { usageCount?: number }): number {
  return item.usageCount ?? 0;
}

export function cmpUsageThenLabel(
  a: UsageRankedItem,
  b: UsageRankedItem,
): number {
  const du = usageOrZero(b) - usageOrZero(a);
  if (du !== 0) return du;
  return a.label.localeCompare(b.label);
}

/** Top N items by 90-day usage, then label. */
export function topUsageItems<T extends UsageRankedItem>(
  items: readonly T[],
  n = 5,
): T[] {
  return [...items].sort(cmpUsageThenLabel).slice(0, n);
}

/** Single default pick: highest 90-day usage, then label. */
export function mostUsedPickId(items: readonly UsageRankedItem[]): string {
  return topUsageItems(items, 1)[0]?.id ?? "";
}

export function quickPickIds(quickItems: readonly { id: string }[]): Set<string> {
  return new Set(quickItems.map((i) => i.id));
}

/** True when there are more than `n` items and selection is outside the quick set. */
export function isOtherSelection(
  selectedId: string,
  quickIds: Set<string>,
  totalCount: number,
  n = 5,
  /** User explicitly chose the empty option via Other (e.g. “No category”). */
  emptySelectedOnOther = false,
): boolean {
  if (totalCount <= n) return false;
  if (selectedId === "") return emptySelectedOnOther;
  return !quickIds.has(selectedId);
}

export function otherChipLabel(
  selectedId: string,
  items: readonly UsageRankedItem[],
  quickIds: Set<string>,
  totalCount: number,
  otherLabel: string,
  n = 5,
  emptySelectedOnOther = false,
): string {
  if (selectedId === "" && emptySelectedOnOther) {
    return items.find((i) => i.id === "")?.label ?? otherLabel;
  }
  if (selectedId === "") return otherLabel;
  if (!isOtherSelection(selectedId, quickIds, totalCount, n, emptySelectedOnOther)) {
    return otherLabel;
  }
  return items.find((i) => i.id === selectedId)?.label ?? otherLabel;
}
