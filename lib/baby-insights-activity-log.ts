import type { BabyMessageKey } from "@/messages/baby/en";
import type { ActivityEditTarget } from "@/lib/baby-insights-activity-edit";

export type ActivityLogCareItem = {
  id: string;
  kind: string;
  type: string;
  at: string;
  endedAt?: string | null;
  summary: string;
  payload?: unknown;
};

export type ActivityLogGrowthItem = {
  id: string;
  kind: string;
  recordedAt: string;
  valueNum: number | null;
  valueText: string | null;
  unit: string | null;
  notes: string | null;
};

export type ActivityLogRow = {
  source: "care" | "growth";
  id: string;
  at: string;
  sortKey: string;
  /** Machine fallback when no i18n key applies (type / kind id). */
  title: string;
  summary: string;
  careType?: "feed" | "diaper" | "sleep";
  growthKind?: string;
  endedAt?: string | null;
  payload?: unknown;
  editTarget: ActivityEditTarget;
};

/** Stable Set key — care and growth UUID spaces can collide if bare id is used. */
export function activityLogSelectionKey(
  target: Pick<ActivityEditTarget, "source" | "id">,
): string {
  return `${target.source}:${target.id}`;
}

/** Parse a selection key back to an edit target, or null if invalid. */
export function parseActivityLogSelectionKey(
  key: string,
): ActivityEditTarget | null {
  const sep = key.indexOf(":");
  if (sep <= 0 || sep === key.length - 1) return null;
  const source = key.slice(0, sep);
  const id = key.slice(sep + 1);
  if (source !== "care" && source !== "growth") return null;
  if (!id) return null;
  return { source, id };
}

/** Selection-bar Edit is enabled only for exactly one selected row. */
export function activitySelectionBarEditEnabled(selectedCount: number): boolean {
  return selectedCount === 1;
}

/** Composite selection keys present in refreshed Activity log rows. */
export function activityLogStillVisibleSelectionKeys(
  rows: ReadonlyArray<{ editTarget: ActivityEditTarget }>,
): Set<string> {
  return new Set(rows.map((row) => activityLogSelectionKey(row.editTarget)));
}

/**
 * After multi-delete settle: drop succeeded keys; keep failed keys only if
 * they are still on screen (intentional vs Money clear-all).
 *
 * `stillVisible` must come from **post-invalidate** rows when invalidate
 * succeeds. If invalidate throws after settle, pass pre-refresh loaded keys
 * so succeeded keys still drop and failed keys stay only if still present.
 */
export function pruneActivityLogSelectionAfterDeletes(
  selected: ReadonlySet<string>,
  settled: ReadonlyArray<{ key: string; ok: boolean }>,
  stillVisible: ReadonlySet<string>,
): Set<string> {
  const next = new Set(selected);
  for (const { key, ok } of settled) {
    if (ok) {
      next.delete(key);
      continue;
    }
    if (!stillVisible.has(key)) {
      next.delete(key);
    }
  }
  return next;
}

/**
 * Drop selection keys that are no longer in the loaded Activity log rows
 * (e.g. after timeline sync truncate removes multi-page care cache).
 * Does not use the DOM visible-cap slice — show-more retention stays intact.
 */
export function pruneActivityLogSelectionToLoadedKeys(
  selected: ReadonlySet<string>,
  loadedKeys: ReadonlySet<string>,
): Set<string> {
  if (selected.size === 0) return new Set();
  const next = new Set<string>();
  for (const key of selected) {
    if (loadedKeys.has(key)) next.add(key);
  }
  return next;
}

/** Partial / all-fail Alert copy after delete settle (null = no Alert). */
export function activityLogDeleteSettleAlert(
  settled: ReadonlyArray<{ ok: boolean }>,
  copy: { allFail: string; partialFail: string },
): string | null {
  const failed = settled.filter((s) => !s.ok).length;
  if (failed === 0) return null;
  return failed === settled.length ? copy.allFail : copy.partialFail;
}

/** Build delete targets from composite selection keys (skips garbage). */
export function activityLogDeleteTargetsFromKeys(
  keys: readonly string[],
): ActivityEditTarget[] {
  const out: ActivityEditTarget[] = [];
  for (const key of keys) {
    const target = parseActivityLogSelectionKey(key);
    if (target) out.push(target);
  }
  return out;
}

/**
 * Concurrent multi-delete pool size. Select-all can keep up to the visible
 * cap (100) and retention can grow further; uncapped `Promise.allSettled`
 * would blast past Baby GraphQL default RPM (60). Pool 4–8 keeps fan-out
 * bounded while still finishing large deletes in a few waves.
 */
export const ACTIVITY_LOG_DELETE_CONCURRENCY = 6;

/**
 * Like `Promise.allSettled(items.map(fn))` but never more than `limit`
 * mappers in flight. Result order matches `items`.
 */
export async function mapAllSettledWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const n = items.length;
  if (n === 0) return [];
  const concurrency = Math.max(1, Math.min(limit, n));
  const results: PromiseSettledResult<R>[] = new Array(n);
  let next = 0;

  async function worker() {
    while (true) {
      const i = next;
      next += 1;
      if (i >= n) return;
      try {
        const value = await mapper(items[i]!, i);
        results[i] = { status: "fulfilled", value };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(
    Array.from({ length: concurrency }, () => worker()),
  );
  return results;
}

/**
 * Post-delete invalidate scope: care-only → `"care"`; growth-only or mixed
 * → `"growth"` (growth scope already refreshes timeline + series).
 */
export function activityLogDeleteInvalidateScope(
  targets: ReadonlyArray<Pick<ActivityEditTarget, "source">>,
): "care" | "growth" {
  for (const t of targets) {
    if (t.source === "growth") return "growth";
  }
  return "care";
}

/** Message key for Activity log / edit modal titles — no hard-coded English. */
export function activityLogRowTitleKey(
  row: Pick<ActivityLogRow, "source" | "careType" | "growthKind">,
): BabyMessageKey | null {
  if (row.source === "care") {
    if (row.careType === "feed") return "insights.chipFeed";
    if (row.careType === "sleep") return "insights.chipSleep";
    if (row.careType === "diaper") return "insights.chipDiaper";
    return null;
  }
  switch (row.growthKind) {
    case "weight":
      return "growth.weight";
    case "height":
      return "growth.height";
    case "head":
      return "growth.head";
    case "temperature":
      return "growth.temperature";
    case "medication":
      return "growth.medication";
    default:
      return null;
  }
}

function growthSummary(g: ActivityLogGrowthItem): string {
  if (g.valueNum != null) {
    return `${g.valueNum}${g.unit ? ` ${g.unit}` : ""}`;
  }
  if (g.valueText) return g.valueText;
  return g.notes ?? "—";
}

/** Merge care + growth into newest-first Activity log rows. */
export function mergeActivityLogRows(
  careItems: readonly ActivityLogCareItem[],
  growthItems: readonly ActivityLogGrowthItem[],
): ActivityLogRow[] {
  const rows: ActivityLogRow[] = [];

  for (const c of careItems) {
    if (c.kind !== "care") continue;
    const careType =
      c.type === "feed" || c.type === "diaper" || c.type === "sleep"
        ? c.type
        : undefined;
    rows.push({
      source: "care",
      id: c.id,
      at: c.at,
      sortKey: `${c.at}\0care\0${c.id}`,
      title: c.type,
      summary: c.summary,
      careType,
      endedAt: c.endedAt ?? null,
      payload: c.payload,
      editTarget: { source: "care", id: c.id },
    });
  }

  for (const g of growthItems) {
    rows.push({
      source: "growth",
      id: g.id,
      at: g.recordedAt,
      sortKey: `${g.recordedAt}\0growth\0${g.id}`,
      title: g.kind,
      summary: growthSummary(g),
      growthKind: g.kind,
      payload: {
        valueNum: g.valueNum,
        valueText: g.valueText,
        unit: g.unit,
        notes: g.notes,
      },
      editTarget: { source: "growth", id: g.id },
    });
  }

  rows.sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0));
  return rows;
}
