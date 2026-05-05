export type MoneyCategoryRow = {
  id: string;
  name: string;
  parentId: string | null;
};

export function moneyCategoryById(categories: MoneyCategoryRow[]) {
  return new Map(categories.map((c) => [c.id, c]));
}

export function moneyCategoryLabel(
  c: MoneyCategoryRow,
  byId: Map<string, MoneyCategoryRow>,
): string {
  if (!c.parentId) return c.name;
  const p = byId.get(c.parentId);
  return p ? `${p.name} → ${c.name}` : c.name;
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
  const roots = categories
    .filter((c) => c.parentId == null)
    .sort((a, b) => a.name.localeCompare(b.name));
  const childrenByParent = new Map<string, MoneyCategoryRow[]>();
  for (const c of categories) {
    if (c.parentId) {
      const list = childrenByParent.get(c.parentId) ?? [];
      list.push(c);
      childrenByParent.set(c.parentId, list);
    }
  }
  for (const list of childrenByParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }
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
    .sort((a, b) =>
      moneyCategoryLabel(a, byId).localeCompare(moneyCategoryLabel(b, byId)),
    );
  for (const c of orphans) {
    groups.push({ type: "single" as const, category: c });
  }
  return groups;
}
