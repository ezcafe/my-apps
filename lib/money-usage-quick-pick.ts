export const QUICK_PICK_N = 5;

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
  n = QUICK_PICK_N,
): T[] {
  return [...items].sort(cmpUsageThenLabel).slice(0, n);
}

/** Other chip when the list overflows or pinned actions (e.g. create) exist. */
export function shouldShowOtherChip(opts: {
  itemCount: number;
  n?: number;
  compact?: boolean;
  pinnedCount?: number;
}): boolean {
  if (opts.compact) return true;
  if ((opts.pinnedCount ?? 0) > 0) return true;
  return opts.itemCount > (opts.n ?? QUICK_PICK_N);
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
  n = QUICK_PICK_N,
  /** User explicitly chose the empty option via Other (e.g. “No category”). */
  emptySelectedOnOther = false,
  pinnedIds?: ReadonlySet<string>,
): boolean {
  if (pinnedIds?.has(selectedId)) return true;
  if (totalCount <= n && (pinnedIds == null || pinnedIds.size === 0)) {
    return false;
  }
  if (totalCount <= n) {
    if (selectedId === "") return emptySelectedOnOther;
    return !quickIds.has(selectedId) && selectedId !== "";
  }
  if (selectedId === "") return emptySelectedOnOther;
  return !quickIds.has(selectedId);
}

export function otherChipLabel(
  selectedId: string,
  items: readonly UsageRankedItem[],
  quickIds: Set<string>,
  totalCount: number,
  otherLabel: string,
  n = QUICK_PICK_N,
  emptySelectedOnOther = false,
  pinnedItems: readonly UsageRankedItem[] = [],
): string {
  const pinned = pinnedItems.find((i) => i.id === selectedId);
  if (pinned) return pinned.label;
  if (selectedId === "" && emptySelectedOnOther) {
    return items.find((i) => i.id === "")?.label ?? otherLabel;
  }
  if (selectedId === "") return otherLabel;
  const pinnedIds = new Set(pinnedItems.map((i) => i.id));
  if (
    !isOtherSelection(
      selectedId,
      quickIds,
      totalCount,
      n,
      emptySelectedOnOther,
      pinnedIds,
    )
  ) {
    return otherLabel;
  }
  return items.find((i) => i.id === selectedId)?.label ?? otherLabel;
}
