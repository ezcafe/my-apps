import type { MoneyCategoryRow } from "@/lib/money-category-ui";
import { parseMajorToMinor } from "@/lib/format-money";

export function resolveUniqueByName<T extends { id: string; name: string }>(
  rows: T[],
  rawName: string,
  label: string,
): string {
  const n = rawName.trim();
  if (!n) throw new Error(`${label} name is empty`);
  const hits = rows.filter((r) => r.name.trim() === n);
  if (hits.length === 0) throw new Error(`Unknown ${label} "${n}"`);
  if (hits.length > 1) throw new Error(`Ambiguous ${label} name "${n}"`);
  return hits[0]!.id;
}

export function resolveRootCategoryId(
  categories: MoneyCategoryRow[],
  rawName: string,
): string {
  const roots = categories.filter((c) => c.parentId == null);
  return resolveUniqueByName(roots, rawName, "parent category");
}

export function resolveLeafCategoryId(
  categories: MoneyCategoryRow[],
  rawName: string,
): string {
  const leaves = categories.filter((c) => c.parentId != null);
  const n = rawName.trim();
  if (!n) throw new Error("Category name is empty");
  const hits = leaves.filter((c) => c.name.trim() === n);
  if (hits.length === 0) throw new Error(`Unknown leaf category "${n}"`);
  if (hits.length > 1) {
    throw new Error(
      `Multiple leaf categories named "${n}". Disambiguate names in your sheet or map values explicitly.`,
    );
  }
  return hits[0]!.id;
}

export function parseBoolCell(raw: string): boolean | undefined {
  const s = raw.trim().toLowerCase();
  if (!s) return undefined;
  if (["1", "true", "yes", "y"].includes(s)) return true;
  if (["0", "false", "no", "n"].includes(s)) return false;
  throw new Error(`Invalid boolean "${raw.trim()}"`);
}

export function parseIntCell(raw: string): number | undefined {
  const s = raw.trim().replace(/,/g, "");
  if (!s) return undefined;
  const n = Number.parseInt(s, 10);
  if (Number.isNaN(n)) throw new Error(`Invalid integer "${raw.trim()}"`);
  return n;
}

export function parseMoneyMinor(raw: string, useMajorUnits: boolean): number | undefined {
  const s = raw.trim();
  if (!s) return undefined;
  if (useMajorUnits) {
    const m = parseMajorToMinor(s);
    if (m == null) throw new Error(`Invalid amount "${raw.trim()}"`);
    return m;
  }
  return parseIntCell(s);
}

export function normalizeIsoDateTime(raw: string): string {
  const s = raw.trim();
  if (!s) throw new Error("Empty date/time");
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date/time "${raw}"`);
  return d.toISOString();
}

export function splitList(raw: string): string[] {
  return raw
    .split(/[|,;]/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function parseUuidList(raw: string): string[] {
  const parts = splitList(raw);
  const out: string[] = [];
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  for (const p of parts) {
    if (!uuid.test(p)) throw new Error(`Invalid UUID in list: "${p}"`);
    out.push(p.toLowerCase());
  }
  return out;
}
