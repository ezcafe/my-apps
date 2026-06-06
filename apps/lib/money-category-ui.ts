export type MoneyCategoryKind = "expense" | "income";

export type MoneyCategoryRow = {
  id: string;
  name: string;
  kind: MoneyCategoryKind;
  parentId: string | null;
  /** Optional 90-day transaction count from `/api/money/categories`. */
  usageCount?: number;
};

export function categoriesOfKind<T extends { kind: MoneyCategoryKind }>(
  rows: readonly T[],
  kind: MoneyCategoryKind,
): T[] {
  return rows.filter((c) => c.kind === kind);
}

export type MoneyCategoryKindGroup = {
  kind: MoneyCategoryKind;
  groups: MoneyCategorySelectGroup[];
};

/**
 * Pre-computes select groups for both kinds so screens that show both sides
 * (e.g. analytics filters, CSV import wizard) can render two top-level
 * sections without re-walking the parent/child tree per render.
 */
export function moneyCategoryGroupsByKind(
  rows: MoneyCategoryRow[],
): MoneyCategoryKindGroup[] {
  return [
    { kind: "expense", groups: moneyCategorySelectGroups(categoriesOfKind(rows, "expense")) },
    { kind: "income", groups: moneyCategorySelectGroups(categoriesOfKind(rows, "income")) },
  ];
}

function usageOrZero(c: MoneyCategoryRow): number {
  return c.usageCount ?? 0;
}

function cmpUsageThenName(a: MoneyCategoryRow, b: MoneyCategoryRow): number {
  const du = usageOrZero(b) - usageOrZero(a);
  if (du !== 0) return du;
  return a.name.localeCompare(b.name);
}

function cmpOrphans(
  a: MoneyCategoryRow,
  b: MoneyCategoryRow,
  byId: Map<string, MoneyCategoryRow>,
): number {
  const du = usageOrZero(b) - usageOrZero(a);
  if (du !== 0) return du;
  return moneyCategoryLabel(a, byId).localeCompare(moneyCategoryLabel(b, byId));
}

export function moneyCategoryById(categories: MoneyCategoryRow[]) {
  return new Map(categories.map((c) => [c.id, c]));
}

export function moneyCategoryLabel(
  c: MoneyCategoryRow,
  byId: Map<string, MoneyCategoryRow>,
): string {
  if (!c.parentId) return c.name;
  const p = byId.get(c.parentId);
  return p ? `${p.name}: ${c.name}` : c.name;
}

export function moneyRootCategories(categories: MoneyCategoryRow[]) {
  return categories.filter((c) => c.parentId == null);
}

/** Roots without children render as a lone option; roots with children use an optgroup. */
export type MoneyCategorySelectGroup =
  | { type: "single"; category: MoneyCategoryRow }
  | { type: "group"; parent: MoneyCategoryRow; children: MoneyCategoryRow[] };

export function moneyCategorySelectGroups(
  categories: MoneyCategoryRow[],
): MoneyCategorySelectGroup[] {
  const byId = moneyCategoryById(categories);
  const childrenByParent = new Map<string, MoneyCategoryRow[]>();
  for (const c of categories) {
    if (c.parentId) {
      const list = childrenByParent.get(c.parentId) ?? [];
      list.push(c);
      childrenByParent.set(c.parentId, list);
    }
  }
  for (const list of childrenByParent.values()) {
    list.sort(cmpUsageThenName);
  }

  const roots = categories.filter((c) => c.parentId == null);
  roots.sort((a, b) => {
    const childrenA = childrenByParent.get(a.id) ?? [];
    const childrenB = childrenByParent.get(b.id) ?? [];
    const usageA =
      usageOrZero(a) +
      childrenA.reduce((s, ch) => s + usageOrZero(ch), 0);
    const usageB =
      usageOrZero(b) +
      childrenB.reduce((s, ch) => s + usageOrZero(ch), 0);
    if (usageB !== usageA) return usageB - usageA;
    return a.name.localeCompare(b.name);
  });

  const rendered = new Set<string>();
  const groups: MoneyCategorySelectGroup[] = roots.map((parent) => {
    const children = childrenByParent.get(parent.id) ?? [];
    if (children.length === 0) {
      rendered.add(parent.id);
      return { type: "single" as const, category: parent };
    }
    rendered.add(parent.id);
    for (const ch of children) rendered.add(ch.id);
    return { type: "group" as const, parent, children };
  });
  const orphans = categories
    .filter((c) => !rendered.has(c.id))
    .sort((a, b) => cmpOrphans(a, b, byId));
  for (const c of orphans) {
    groups.push({ type: "single" as const, category: c });
  }
  return groups;
}

export type MoneyCategoryTreeRow = { id: string; parentId: string | null };

/** Each category id maps to itself plus all descendant category ids. */
export function moneyCategoryDescendantsById(
  rows: ReadonlyArray<MoneyCategoryTreeRow>,
): Map<string, string[]> {
  const childrenByParent = new Map<string, string[]>();
  for (const c of rows) {
    if (!c.parentId) continue;
    const arr = childrenByParent.get(c.parentId) ?? [];
    arr.push(c.id);
    childrenByParent.set(c.parentId, arr);
  }

  const descendantsByCategory = new Map<string, string[]>();
  for (const c of rows) {
    const visited = new Set<string>([c.id]);
    const queue = [c.id];
    while (queue.length > 0) {
      const cur = queue.shift();
      if (!cur) continue;
      for (const child of childrenByParent.get(cur) ?? []) {
        if (visited.has(child)) continue;
        visited.add(child);
        queue.push(child);
      }
    }
    descendantsByCategory.set(c.id, [...visited]);
  }
  return descendantsByCategory;
}

/** Expands selected category ids to include all descendants (parent → children). */
export function expandCategoryFilterIds(
  selectedIds: readonly string[],
  rows: ReadonlyArray<MoneyCategoryTreeRow>,
): string[] {
  if (selectedIds.length === 0) return [];
  const byDescendants = moneyCategoryDescendantsById(rows);
  const out = new Set<string>();
  for (const id of selectedIds) {
    const desc = byDescendants.get(id);
    if (desc) {
      for (const d of desc) out.add(d);
    } else {
      out.add(id);
    }
  }
  return [...out];
}
