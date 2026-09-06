import {
  and,
  desc,
  eq,
  gte,
  lt,
  lte,
  or,
  type Column,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import { babyCareEvent, babyGrowthEntry } from "@/db/schema/baby";
import { formatBabyDurationCompact } from "@/lib/baby-format-duration";
import { t, type BabyLocale } from "@/lib/baby-i18n";
import { babyTimelineInputSchema } from "@/lib/validators/baby";

export type BabyTimelineItem = {
  id: string;
  kind: "care" | "growth";
  type: string;
  at: string;
  endedAt: string | null;
  payload: unknown;
  summary: string;
  source: string;
  cursor: string;
};

export function encodeBabyTimelineCursor(atMs: number, id: string): string {
  return Buffer.from(`${atMs}|${id}`, "utf8").toString("base64url");
}

export function decodeBabyTimelineCursor(
  cursor: string,
): { atMs: number; id: string } | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const [at, id] = raw.split("|");
    const atMs = Number(at);
    if (!id || !Number.isFinite(atMs)) return null;
    return { atMs, id };
  } catch {
    return null;
  }
}

function appendCompactDuration(label: string, totalSec: number | null): string {
  if (totalSec == null || !Number.isFinite(totalSec) || totalSec < 0) {
    return label;
  }
  return `${label} · ${formatBabyDurationCompact(totalSec)}`;
}

/** Duration seconds for a care row; null when unknown (no fake fragment). */
export function careDurationSec(
  type: string,
  payload: unknown,
  endedAt: string | Date | null = null,
  occurredAt: string | Date | null = null,
): number | null {
  const p = (payload ?? {}) as Record<string, unknown>;
  if (type === "feed") {
    const sec = p.durationSec;
    if (typeof sec === "number" && Number.isFinite(sec) && sec > 0) {
      return Math.floor(sec);
    }
    return null;
  }
  if (type === "sleep") {
    if (endedAt == null || String(endedAt).length === 0) return null;
    if (occurredAt == null || String(occurredAt).length === 0) return null;
    const startMs = Date.parse(String(occurredAt));
    const endMs = Date.parse(String(endedAt));
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
      return null;
    }
    return Math.floor((endMs - startMs) / 1000);
  }
  return null;
}

export function careSummary(
  type: string,
  payload: unknown,
  locale: BabyLocale = "en",
  endedAt: string | Date | null = null,
  occurredAt: string | Date | null = null,
): string {
  const p = (payload ?? {}) as Record<string, unknown>;
  const ended = endedAt != null && String(endedAt).length > 0;

  if (type === "feed") {
    const method = friendlyFeedMethod(String(p.method ?? ""), locale);
    const label = t("summary.feed", locale).replace("{method}", method);
    return appendCompactDuration(
      label,
      careDurationSec("feed", payload, endedAt, occurredAt),
    );
  }
  if (type === "diaper") {
    const kind = friendlyDiaperKind(String(p.kind ?? ""));
    return t("summary.diaper", locale).replace("{kind}", kind);
  }
  if (type === "sleep") {
    let label: string;
    if (ended) {
      label = p.notes
        ? t("summary.sleepEndedNotes", locale).replace("{notes}", String(p.notes))
        : t("summary.sleepEnded", locale);
    } else {
      label = p.notes
        ? t("summary.sleepStartedNotes", locale).replace("{notes}", String(p.notes))
        : t("summary.sleepStarted", locale);
    }
    return appendCompactDuration(
      label,
      careDurationSec("sleep", payload, endedAt, occurredAt),
    );
  }
  return type;
}

function friendlyFeedMethod(method: string, locale: BabyLocale): string {
  if (method === "breast_l" || method === "breastL") {
    return t("feed.breastL", locale);
  }
  if (method === "breast_r" || method === "breastR") {
    return t("feed.breastR", locale);
  }
  if (method === "formula") return t("feed.formula", locale);
  if (method === "pump") return t("feed.pump", locale);
  return method || "—";
}

function friendlyDiaperKind(kind: string): string {
  return kind || "—";
}

export function growthSummary(
  kind: string,
  valueNum: string | null,
  unit: string | null,
  locale: BabyLocale = "en",
): string {
  if (valueNum != null) {
    return t("summary.growthValue", locale)
      .replace("{kind}", kind)
      .replace("{value}", valueNum)
      .replace("{unit}", unit ? ` ${unit}` : "");
  }
  return t("summary.growth", locale).replace("{kind}", kind);
}

function sortTimelineDesc(a: BabyTimelineItem, b: BabyTimelineItem): number {
  const diff = Date.parse(b.at) - Date.parse(a.at);
  if (diff !== 0) return diff;
  return b.id.localeCompare(a.id);
}

/** Merge care + growth, sort time desc, apply cursor page. Pure — testable without DB. */
export function mergeAndPageBabyTimeline(
  items: BabyTimelineItem[],
  opts: { cursor?: string | null; limit: number },
): { items: BabyTimelineItem[]; nextCursor: string | null } {
  const merged = [...items].sort(sortTimelineDesc);

  const cursor = opts.cursor ? decodeBabyTimelineCursor(opts.cursor) : null;
  if (opts.cursor && !cursor) {
    throw new Error("Validation failed: bad cursor");
  }
  let start = 0;
  if (cursor) {
    start = merged.findIndex((item) => {
      const atMs = Date.parse(item.at);
      return (
        atMs < cursor.atMs || (atMs === cursor.atMs && item.id < cursor.id)
      );
    });
    if (start < 0) start = merged.length;
  }

  const page = merged.slice(start, start + opts.limit);
  const next =
    start + opts.limit < merged.length
      ? (page[page.length - 1]?.cursor ?? null)
      : null;

  return { items: page, nextCursor: next };
}

/**
 * Union keyset page: each side already filtered after cursor and capped at `limit`.
 * Taking `limit` from each sorted stream is a proven bound for the next union page.
 */
export function mergeKeysetSources(
  care: BabyTimelineItem[],
  growth: BabyTimelineItem[],
  limit: number,
): { items: BabyTimelineItem[]; nextCursor: string | null } {
  const merged = [...care, ...growth].sort(sortTimelineDesc);
  const page = merged.slice(0, limit);
  const hasMore =
    page.length === limit &&
    (merged.length > limit ||
      care.length === limit ||
      growth.length === limit);
  return {
    items: page,
    nextCursor: hasMore ? (page[page.length - 1]?.cursor ?? null) : null,
  };
}

function keysetBefore(
  atCol: Column,
  idCol: Column,
  cursor: { atMs: number; id: string },
): SQL {
  const at = new Date(cursor.atMs);
  return or(lt(atCol, at), and(eq(atCol, at), lt(idCol, cursor.id))) as SQL;
}

export async function listBabyTimeline(
  workspaceId: string,
  raw: unknown,
  locale: BabyLocale = "en",
): Promise<{ items: BabyTimelineItem[]; nextCursor: string | null }> {
  const input = babyTimelineInputSchema.parse(raw ?? {});
  const limit = input.limit ?? 50;
  const from = input.from ? new Date(input.from) : null;
  const to = input.to ? new Date(input.to) : null;

  let cursor: { atMs: number; id: string } | null = null;
  if (input.cursor) {
    cursor = decodeBabyTimelineCursor(input.cursor);
    if (!cursor) throw new Error("Validation failed: bad cursor");
  }

  // Workspace isolation: every query is scoped to workspaceId.
  const careConds = [eq(babyCareEvent.workspaceId, workspaceId)];
  if (from) careConds.push(gte(babyCareEvent.occurredAt, from));
  if (to) careConds.push(lte(babyCareEvent.occurredAt, to));
  if (cursor) {
    careConds.push(
      keysetBefore(babyCareEvent.occurredAt, babyCareEvent.id, cursor),
    );
  }

  const growthConds = [eq(babyGrowthEntry.workspaceId, workspaceId)];
  if (from) growthConds.push(gte(babyGrowthEntry.recordedAt, from));
  if (to) growthConds.push(lte(babyGrowthEntry.recordedAt, to));
  if (cursor) {
    growthConds.push(
      keysetBefore(babyGrowthEntry.recordedAt, babyGrowthEntry.id, cursor),
    );
  }

  // Proven bound: limit rows from each side after keyset, then merge.
  // Parallelize independent keyset reads (async-parallel).
  const [careRows, growthRows] = await Promise.all([
    db
      .select()
      .from(babyCareEvent)
      .where(and(...careConds))
      .orderBy(desc(babyCareEvent.occurredAt), desc(babyCareEvent.id))
      .limit(limit),
    db
      .select()
      .from(babyGrowthEntry)
      .where(and(...growthConds))
      .orderBy(desc(babyGrowthEntry.recordedAt), desc(babyGrowthEntry.id))
      .limit(limit),
  ]);

  const careItems: BabyTimelineItem[] = careRows.map((r) => {
    const atMs = r.occurredAt.getTime();
    return {
      id: r.id,
      kind: "care" as const,
      type: r.type,
      at: r.occurredAt.toISOString(),
      endedAt: r.endedAt?.toISOString() ?? null,
      payload: r.payload,
      summary: careSummary(
        r.type,
        r.payload,
        locale,
        r.endedAt,
        r.occurredAt,
      ),
      source: r.source,
      cursor: encodeBabyTimelineCursor(atMs, r.id),
    };
  });

  const growthItems: BabyTimelineItem[] = growthRows.map((r) => {
    const atMs = r.recordedAt.getTime();
    return {
      id: r.id,
      kind: "growth" as const,
      type: r.kind,
      at: r.recordedAt.toISOString(),
      endedAt: null,
      payload: {
        valueNum: r.valueNum,
        valueText: r.valueText,
        unit: r.unit,
        notes: r.notes,
      },
      summary: growthSummary(r.kind, r.valueNum, r.unit, locale),
      source: r.source,
      cursor: encodeBabyTimelineCursor(atMs, r.id),
    };
  });

  return mergeKeysetSources(careItems, growthItems, limit);
}
