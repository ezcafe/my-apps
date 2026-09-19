import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { babyCareEvent, babyGrowthEntry } from "@/db/schema/baby";
import {
  findOpenSleep,
  type BabyCareEventRow,
} from "@/features/baby/server/care-events";
import { ensureBabyProfile } from "@/features/baby/server/profile";
import {
  careSummary,
  encodeBabyTimelineCursor,
  type BabyTimelineItem,
} from "@/features/baby/server/timeline";
import { extractFormulaMlFromPayload } from "@/lib/baby-formula-ml";
import type { BabyLocale } from "@/lib/baby-i18n";
import { parseOrThrow } from "@/lib/parse-or-throw";
import { babyHomeQuickStatusInputSchema } from "@/lib/validators/baby";

export type BabyHomeQuickStatusRow = {
  lastFeed: BabyTimelineItem | null;
  lastSleep: BabyTimelineItem | null;
  lastDiaper: BabyTimelineItem | null;
  /** Newest feed whose method/legs are pump family. */
  lastPump: BabyTimelineItem | null;
  openSleep: BabyCareEventRow | null;
  feedsToday: number;
  birthDate: string | null;
  latestWeightKg: number | null;
  /** Distinct formula ml, newest by occurredAt first, max 3. */
  recentBottleMl: number[];
};

export type HomeQuickStatusDeps = {
  ensureBabyProfile: (
    workspaceId: string,
  ) => Promise<{ id: string; birthDate: string | null }>;
  findLastOfType: (
    workspaceId: string,
    babyId: string,
    type: "feed" | "sleep" | "diaper",
  ) => Promise<BabyCareEventRow | null>;
  /** Newest breast/formula feed (skips pump-only). Optional — defaults to findLastOfType feed. */
  findLastFeed?: (
    workspaceId: string,
    babyId: string,
  ) => Promise<BabyCareEventRow | null>;
  findLastPump: (
    workspaceId: string,
    babyId: string,
  ) => Promise<BabyCareEventRow | null>;
  findOpenSleep: (
    workspaceId: string,
    babyId: string,
  ) => Promise<BabyCareEventRow | null>;
  countFeedsInWindow: (
    workspaceId: string,
    babyId: string,
    dayFrom: Date,
    dayTo: Date,
  ) => Promise<number>;
  findLatestWeightKg: (
    workspaceId: string,
    babyId: string,
  ) => Promise<number | null>;
  findRecentBottleMl: (
    workspaceId: string,
    babyId: string,
  ) => Promise<number[]>;
};

/** Scan cap — enough to find 3 distinct formula ml values. */
export const BABY_RECENT_BOTTLE_ML_SCAN = 40;

/**
 * Pure: rows already newest by occurredAt then id. One ml per event; stop at 3.
 */
export function collectRecentBottleMlFromRows(
  rows: Array<{ payload: unknown }>,
  limit = 3,
): number[] {
  const recentBottleMl: number[] = [];
  for (const row of rows) {
    const ml = extractFormulaMlFromPayload(row.payload);
    if (ml == null || ml <= 0) continue;
    if (recentBottleMl.includes(ml)) continue;
    recentBottleMl.push(ml);
    if (recentBottleMl.length >= limit) break;
  }
  return recentBottleMl;
}

function toTimelineItem(
  row: BabyCareEventRow,
  locale: BabyLocale,
): BabyTimelineItem {
  // Feed status / next-due activity uses updated_at when present.
  const activityAt =
    row.type === "feed" && row.updatedAt
      ? row.updatedAt
      : row.occurredAt;
  const at = activityAt.toISOString();
  return {
    id: row.id,
    kind: "care",
    type: row.type,
    at,
    endedAt: row.endedAt?.toISOString() ?? null,
    payload: row.payload,
    summary: careSummary(
      row.type,
      row.payload,
      locale,
      row.endedAt,
      row.occurredAt,
    ),
    source: row.source,
    cursor: encodeBabyTimelineCursor(activityAt.getTime(), row.id),
  };
}

async function defaultFindLastOfType(
  workspaceId: string,
  babyId: string,
  type: "feed" | "sleep" | "diaper",
): Promise<BabyCareEventRow | null> {
  // Feeds: last activity = updated_at (merge bumps it). Sleep/diaper stay occurred_at.
  const orderCol =
    type === "feed" ? babyCareEvent.updatedAt : babyCareEvent.occurredAt;
  const rows = await db
    .select()
    .from(babyCareEvent)
    .where(
      and(
        eq(babyCareEvent.workspaceId, workspaceId),
        eq(babyCareEvent.babyId, babyId),
        eq(babyCareEvent.type, type),
      ),
    )
    .orderBy(desc(orderCol), desc(babyCareEvent.id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Half-open local-day membership: [dayFrom, dayTo).
 * defaultCountFeeds must use gte(occurredAt, dayFrom) + lt(occurredAt, dayTo)
 * — never lte — so this helper and SQL stay in lockstep.
 */
export function isFeedInBabyDayWindow(
  occurredAt: Date,
  dayFrom: Date,
  dayTo: Date,
): boolean {
  const t = occurredAt.getTime();
  return t >= dayFrom.getTime() && t < dayTo.getTime();
}

export function countFeedsInHalfOpenWindow(
  feeds: Array<{ occurredAt: Date }>,
  dayFrom: Date,
  dayTo: Date,
): number {
  return feeds.filter((f) =>
    isFeedInBabyDayWindow(f.occurredAt, dayFrom, dayTo),
  ).length;
}

async function defaultCountFeeds(
  workspaceId: string,
  babyId: string,
  dayFrom: Date,
  dayTo: Date,
): Promise<number> {
  // Bounds must match isFeedInBabyDayWindow (gte + lt, not lte).
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(babyCareEvent)
    .where(
      and(
        eq(babyCareEvent.workspaceId, workspaceId),
        eq(babyCareEvent.babyId, babyId),
        eq(babyCareEvent.type, "feed"),
        gte(babyCareEvent.occurredAt, dayFrom),
        lt(babyCareEvent.occurredAt, dayTo),
      ),
    );
  return Number(rows[0]?.n ?? 0);
}

/** Normalize growth weight row to kg; ignore lb / unknown. */
export function normalizeGrowthWeightToKg(row: {
  valueNum: string | number | null;
  unit: string | null;
} | null): number | null {
  if (!row || row.valueNum == null) return null;
  const n = Number(row.valueNum);
  if (!Number.isFinite(n)) return null;
  const unit = (row.unit ?? "").trim().toLowerCase();
  if (unit === "kg") return n;
  if (unit === "g") return n / 1000;
  return null;
}

export type LatestGrowthWeightRow = {
  valueNum: string | number | null;
  unit: string | null;
};

async function queryLatestWeightRow(
  workspaceId: string,
  babyId: string,
): Promise<LatestGrowthWeightRow | null> {
  const rows = await db
    .select({
      valueNum: babyGrowthEntry.valueNum,
      unit: babyGrowthEntry.unit,
    })
    .from(babyGrowthEntry)
    .where(
      and(
        eq(babyGrowthEntry.workspaceId, workspaceId),
        eq(babyGrowthEntry.babyId, babyId),
        eq(babyGrowthEntry.kind, "weight"),
      ),
    )
    .orderBy(desc(babyGrowthEntry.recordedAt), desc(babyGrowthEntry.id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * SQL row → kg. Optional `queryRow` injects a raw growth row for unit tests
 * so the normalize wire is covered without calling normalize inside a mock.
 */
export async function defaultFindLatestWeightKg(
  workspaceId: string,
  babyId: string,
  queryRow: (
    workspaceId: string,
    babyId: string,
  ) => Promise<LatestGrowthWeightRow | null> = queryLatestWeightRow,
): Promise<number | null> {
  return normalizeGrowthWeightToKg(await queryRow(workspaceId, babyId));
}

async function defaultFindRecentBottleMl(
  workspaceId: string,
  babyId: string,
): Promise<number[]> {
  const rows = await db
    .select({
      id: babyCareEvent.id,
      payload: babyCareEvent.payload,
      occurredAt: babyCareEvent.occurredAt,
    })
    .from(babyCareEvent)
    .where(
      and(
        eq(babyCareEvent.workspaceId, workspaceId),
        eq(babyCareEvent.babyId, babyId),
        eq(babyCareEvent.type, "feed"),
      ),
    )
    .orderBy(desc(babyCareEvent.occurredAt), desc(babyCareEvent.id))
    .limit(BABY_RECENT_BOTTLE_ML_SCAN);
  return collectRecentBottleMlFromRows(rows);
}

/** True when feed payload is pump / pump_l / pump_r (top-level or legs). */
export function carePayloadIsPumpFamily(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as {
    method?: unknown;
    legs?: Array<{ method?: unknown }>;
  };
  const methods = [
    ...(typeof p.method === "string" ? [p.method] : []),
    ...(p.legs ?? [])
      .map((l) => l.method)
      .filter((m): m is string => typeof m === "string"),
  ];
  return methods.some(
    (m) => m === "pump" || m === "pump_l" || m === "pump_r",
  );
}

/** True when payload has breast and/or formula (not pump-only). */
export function carePayloadIsFeedFamily(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as {
    method?: unknown;
    legs?: Array<{ method?: unknown }>;
  };
  const methods = [
    ...(typeof p.method === "string" ? [p.method] : []),
    ...(p.legs ?? [])
      .map((l) => l.method)
      .filter((m): m is string => typeof m === "string"),
  ];
  return methods.some(
    (m) => m === "breast_l" || m === "breast_r" || m === "formula",
  );
}

async function defaultFindLastFeed(
  workspaceId: string,
  babyId: string,
): Promise<BabyCareEventRow | null> {
  const rows = await db
    .select()
    .from(babyCareEvent)
    .where(
      and(
        eq(babyCareEvent.workspaceId, workspaceId),
        eq(babyCareEvent.babyId, babyId),
        eq(babyCareEvent.type, "feed"),
      ),
    )
    .orderBy(desc(babyCareEvent.updatedAt), desc(babyCareEvent.id))
    .limit(40);
  for (const row of rows) {
    // Skip pump-only rows — those surface under lastPump.
    if (carePayloadIsFeedFamily(row.payload)) return row;
    if (!carePayloadIsPumpFamily(row.payload)) return row;
  }
  return null;
}

async function defaultFindLastPump(
  workspaceId: string,
  babyId: string,
): Promise<BabyCareEventRow | null> {
  const rows = await db
    .select()
    .from(babyCareEvent)
    .where(
      and(
        eq(babyCareEvent.workspaceId, workspaceId),
        eq(babyCareEvent.babyId, babyId),
        eq(babyCareEvent.type, "feed"),
      ),
    )
    .orderBy(desc(babyCareEvent.updatedAt), desc(babyCareEvent.id))
    .limit(40);
  for (const row of rows) {
    if (carePayloadIsPumpFamily(row.payload)) return row;
  }
  return null;
}

function defaultDeps(): HomeQuickStatusDeps {
  return {
    ensureBabyProfile: async (workspaceId) => {
      const baby = await ensureBabyProfile(workspaceId);
      return { id: baby.id, birthDate: baby.birthDate };
    },
    findLastOfType: defaultFindLastOfType,
    findLastFeed: defaultFindLastFeed,
    findLastPump: defaultFindLastPump,
    findOpenSleep,
    countFeedsInWindow: defaultCountFeeds,
    findLatestWeightKg: defaultFindLatestWeightKg,
    findRecentBottleMl: defaultFindRecentBottleMl,
  };
}

export async function getBabyHomeQuickStatus(
  workspaceId: string,
  raw: unknown,
  locale: BabyLocale = "en",
  deps: HomeQuickStatusDeps = defaultDeps(),
): Promise<BabyHomeQuickStatusRow> {
  const input = parseOrThrow(babyHomeQuickStatusInputSchema, raw);
  const dayFrom = new Date(input.dayFrom);
  const dayTo = new Date(input.dayTo);

  const baby = await deps.ensureBabyProfile(workspaceId);
  const [
    lastFeed,
    lastSleep,
    lastDiaper,
    lastPump,
    openSleep,
    feedsToday,
    latestWeightKg,
    recentBottleMl,
  ] = await Promise.all([
    deps.findLastFeed
      ? deps.findLastFeed(workspaceId, baby.id)
      : deps.findLastOfType(workspaceId, baby.id, "feed"),
    deps.findLastOfType(workspaceId, baby.id, "sleep"),
    deps.findLastOfType(workspaceId, baby.id, "diaper"),
    deps.findLastPump(workspaceId, baby.id),
    deps.findOpenSleep(workspaceId, baby.id),
    deps.countFeedsInWindow(workspaceId, baby.id, dayFrom, dayTo),
    deps.findLatestWeightKg(workspaceId, baby.id),
    deps.findRecentBottleMl(workspaceId, baby.id),
  ]);

  return {
    lastFeed: lastFeed ? toTimelineItem(lastFeed, locale) : null,
    lastSleep: lastSleep ? toTimelineItem(lastSleep, locale) : null,
    lastDiaper: lastDiaper ? toTimelineItem(lastDiaper, locale) : null,
    lastPump: lastPump ? toTimelineItem(lastPump, locale) : null,
    openSleep,
    feedsToday,
    birthDate: baby.birthDate,
    latestWeightKg,
    recentBottleMl,
  };
}
