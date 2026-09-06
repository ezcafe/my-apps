import { and, desc, eq, gte, lt, lte, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { babyGrowthEntry } from "@/db/schema/baby";
import { ensureBabyProfile } from "@/features/baby/server/profile";
import {
  decodeBabyTimelineCursor,
  encodeBabyTimelineCursor,
} from "@/features/baby/server/timeline";
import { parseOrThrow } from "@/lib/parse-or-throw";
import {
  babyGrowthListInputSchema,
  createBabyGrowthSchema,
  updateBabyGrowthSchema,
  type CreateBabyGrowthInput,
} from "@/lib/validators/baby";

export { growthEntriesToSeries } from "@/lib/baby-growth-series";

export const encodeBabyGrowthCursor = encodeBabyTimelineCursor;
export const decodeBabyGrowthCursor = decodeBabyTimelineCursor;

export type BabyGrowthPageItem = {
  id: string;
  recordedAt: string;
};

export type BabyGrowthRecordedAtRangeOpts = {
  from?: string | null;
  to?: string | null;
};

/**
 * Inclusive recordedAt bounds for listBabyGrowthEntries (maps to gte/lte).
 * Shared so tests exercise the same date parsing production uses.
 */
export function babyGrowthRecordedAtRangeBounds(
  opts: BabyGrowthRecordedAtRangeOpts,
): { from: Date | null; to: Date | null } {
  return {
    from: opts.from ? new Date(opts.from) : null,
    to: opts.to ? new Date(opts.to) : null,
  };
}

/**
 * Drizzle gte/lte conditions for recordedAt — used by listBabyGrowthEntries.
 */
export function babyGrowthRecordedAtRangeConds(
  opts: BabyGrowthRecordedAtRangeOpts,
): SQL[] {
  const bounds = babyGrowthRecordedAtRangeBounds(opts);
  const out: SQL[] = [];
  if (bounds.from) {
    out.push(gte(babyGrowthEntry.recordedAt, bounds.from));
  }
  if (bounds.to) {
    out.push(lte(babyGrowthEntry.recordedAt, bounds.to));
  }
  return out;
}

/**
 * Pure page helper (sorted desc by recordedAt, then id).
 * Used by unit tests; DB path uses keyset + limit instead.
 */
export function pageBabyGrowthEntries<T extends BabyGrowthPageItem>(
  items: T[],
  opts: { cursor?: string | null; limit: number },
): { items: T[]; nextCursor: string | null } {
  const sorted = [...items].sort((a, b) => {
    const diff = Date.parse(b.recordedAt) - Date.parse(a.recordedAt);
    if (diff !== 0) return diff;
    return b.id.localeCompare(a.id);
  });

  const cursor = opts.cursor ? decodeBabyGrowthCursor(opts.cursor) : null;
  if (opts.cursor && !cursor) {
    throw new Error("Validation failed: bad cursor");
  }

  let start = 0;
  if (cursor) {
    start = sorted.findIndex((item) => {
      const atMs = Date.parse(item.recordedAt);
      return (
        atMs < cursor.atMs || (atMs === cursor.atMs && item.id < cursor.id)
      );
    });
    if (start < 0) start = sorted.length;
  }

  const page = sorted.slice(start, start + opts.limit);
  const next =
    start + opts.limit < sorted.length && page.length > 0
      ? encodeBabyGrowthCursor(
          Date.parse(page[page.length - 1]!.recordedAt),
          page[page.length - 1]!.id,
        )
      : null;

  return { items: page, nextCursor: next };
}

export async function createBabyGrowth(
  workspaceId: string,
  userSub: string,
  raw: CreateBabyGrowthInput,
) {
  const input = parseOrThrow(createBabyGrowthSchema, raw);
  const baby = await ensureBabyProfile(workspaceId);
  const [row] = await db
    .insert(babyGrowthEntry)
    .values({
      workspaceId,
      babyId: baby.id,
      kind: input.kind,
      recordedAt: input.recordedAt ? new Date(input.recordedAt) : new Date(),
      valueNum: input.valueNum != null ? String(input.valueNum) : null,
      valueText: input.valueText ?? null,
      unit: input.unit ?? null,
      notes: input.notes ?? null,
      source: input.source ?? "web",
      createdByUserSub: userSub,
      updatedByUserSub: userSub,
    })
    .returning();
  return row;
}

export async function listBabyGrowthEntries(
  workspaceId: string,
  raw?: unknown,
) {
  const input = babyGrowthListInputSchema.parse(raw ?? {});
  const limit = input.limit ?? 50;

  let cursor: { atMs: number; id: string } | null = null;
  if (input.cursor) {
    cursor = decodeBabyGrowthCursor(input.cursor);
    if (!cursor) throw new Error("Validation failed: bad cursor");
  }

  const conds = [eq(babyGrowthEntry.workspaceId, workspaceId)];
  if (input.kind) {
    conds.push(
      eq(
        babyGrowthEntry.kind,
        input.kind as
          | "weight"
          | "height"
          | "head"
          | "temperature"
          | "medication",
      ),
    );
  }
  conds.push(...babyGrowthRecordedAtRangeConds(input));
  if (cursor) {
    const at = new Date(cursor.atMs);
    conds.push(
      or(
        lt(babyGrowthEntry.recordedAt, at),
        and(
          eq(babyGrowthEntry.recordedAt, at),
          lt(babyGrowthEntry.id, cursor.id),
        ),
      ) as SQL,
    );
  }

  const rows = await db
    .select()
    .from(babyGrowthEntry)
    .where(and(...conds))
    .orderBy(desc(babyGrowthEntry.recordedAt), desc(babyGrowthEntry.id))
    .limit(limit);

  const nextCursor =
    rows.length === limit
      ? encodeBabyGrowthCursor(
          rows[rows.length - 1]!.recordedAt.getTime(),
          rows[rows.length - 1]!.id,
        )
      : null;

  return { items: rows, nextCursor };
}

export async function updateBabyGrowth(
  workspaceId: string,
  userSub: string,
  raw: unknown,
) {
  const input = parseOrThrow(updateBabyGrowthSchema, raw);
  const existing = await db
    .select()
    .from(babyGrowthEntry)
    .where(
      and(
        eq(babyGrowthEntry.id, input.id),
        eq(babyGrowthEntry.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  if (!existing[0]) throw new Error("NOT_FOUND");

  const [row] = await db
    .update(babyGrowthEntry)
    .set({
      ...(input.kind ? { kind: input.kind } : {}),
      ...(input.recordedAt ? { recordedAt: new Date(input.recordedAt) } : {}),
      ...(input.valueNum !== undefined
        ? { valueNum: input.valueNum != null ? String(input.valueNum) : null }
        : {}),
      ...(input.valueText !== undefined ? { valueText: input.valueText } : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      updatedByUserSub: userSub,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(babyGrowthEntry.id, input.id),
        eq(babyGrowthEntry.workspaceId, workspaceId),
      ),
    )
    .returning();
  return row;
}

export async function deleteBabyGrowth(workspaceId: string, id: string) {
  const [row] = await db
    .delete(babyGrowthEntry)
    .where(
      and(
        eq(babyGrowthEntry.id, id),
        eq(babyGrowthEntry.workspaceId, workspaceId),
      ),
    )
    .returning();
  if (!row) throw new Error("NOT_FOUND");
  return row;
}
