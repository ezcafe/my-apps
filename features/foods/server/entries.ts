import { and, asc, eq, gte, lte } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "@/db";
import { foodAnalysis, foodLogEntry } from "@/db/schema/foods";
import {
  analysisWindowStart,
  filterEntriesInAnalysisWindow,
  runFoodsAnalysis,
  upsertFoodAnalysisOnError,
  type CompleteChat,
  type FoodsAnalysisRow,
} from "@/features/foods/server/analyze-foods";
import { createFoodsCompleteChat } from "@/features/foods/server/llm";
import type { FoodType, MealSlot } from "@/lib/validators/foods";

export type FoodLogEntryDto = {
  id: string;
  loggedOn: string;
  foodType: FoodType;
  mealSlot: MealSlot | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FoodAnalysisDto = {
  summary: string;
  suggestions: string[];
  status: "ok" | "error";
  errorMessage: string | null;
  windowStart: string | null;
  windowEnd: string | null;
  updatedAt: string;
};

function mapEntry(row: typeof foodLogEntry.$inferSelect): FoodLogEntryDto {
  return {
    id: row.id,
    loggedOn: row.loggedOn,
    foodType: row.foodType as FoodType,
    mealSlot: (row.mealSlot as MealSlot | null) ?? null,
    note: row.note ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapAnalysis(row: typeof foodAnalysis.$inferSelect): FoodAnalysisDto {
  return {
    summary: row.summary,
    suggestions: Array.isArray(row.suggestions) ? row.suggestions : [],
    status: row.status,
    errorMessage: row.errorMessage ?? null,
    windowStart: row.windowStart ?? null,
    windowEnd: row.windowEnd ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listFoodEntries(args: {
  workspaceId: string;
  from: string;
  to: string;
}): Promise<FoodLogEntryDto[]> {
  const rows = await db
    .select()
    .from(foodLogEntry)
    .where(
      and(
        eq(foodLogEntry.workspaceId, args.workspaceId),
        gte(foodLogEntry.loggedOn, args.from),
        lte(foodLogEntry.loggedOn, args.to),
      ),
    )
    .orderBy(asc(foodLogEntry.loggedOn), asc(foodLogEntry.createdAt));
  return rows.map(mapEntry);
}

export async function getFoodAnalysis(
  workspaceId: string,
): Promise<FoodAnalysisDto | null> {
  const rows = await db
    .select()
    .from(foodAnalysis)
    .where(eq(foodAnalysis.workspaceId, workspaceId))
    .limit(1);
  return rows[0] ? mapAnalysis(rows[0]) : null;
}

function entryHash(
  entries: Array<{ loggedOn: string; foodType: string; mealSlot: string | null; note: string | null }>,
): string {
  const payload = JSON.stringify(entries);
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

export async function refreshFoodAnalysis(args: {
  workspaceId: string;
  todayYmd: string;
  completeChat?: CompleteChat;
}): Promise<FoodAnalysisDto> {
  const completeChat = args.completeChat ?? createFoodsCompleteChat();
  const windowStart = analysisWindowStart(args.todayYmd);
  const rows = await db
    .select()
    .from(foodLogEntry)
    .where(
      and(
        eq(foodLogEntry.workspaceId, args.workspaceId),
        gte(foodLogEntry.loggedOn, windowStart),
        lte(foodLogEntry.loggedOn, args.todayYmd),
      ),
    );
  const mapped = rows.map((r) => ({
    loggedOn: r.loggedOn,
    foodType: r.foodType as FoodType,
    mealSlot: (r.mealSlot as MealSlot | null) ?? null,
    note: r.note ?? null,
  }));
  const inWindow = filterEntriesInAnalysisWindow(mapped, args.todayYmd);
  const hash = entryHash(inWindow);

  const priorRows = await db
    .select()
    .from(foodAnalysis)
    .where(eq(foodAnalysis.workspaceId, args.workspaceId))
    .limit(1);
  const prior = priorRows[0]
    ? ({
        summary: priorRows[0].summary,
        suggestions: Array.isArray(priorRows[0].suggestions)
          ? priorRows[0].suggestions
          : [],
        status: priorRows[0].status,
        errorMessage: priorRows[0].errorMessage ?? null,
      } satisfies FoodsAnalysisRow)
    : null;

  try {
    const parsed = await runFoodsAnalysis(mapped, args.todayYmd, completeChat);
    const [upserted] = await db
      .insert(foodAnalysis)
      .values({
        workspaceId: args.workspaceId,
        summary: parsed.summary,
        suggestions: parsed.suggestions,
        windowStart,
        windowEnd: args.todayYmd,
        entryHash: hash,
        status: "ok",
        errorMessage: null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: foodAnalysis.workspaceId,
        set: {
          summary: parsed.summary,
          suggestions: parsed.suggestions,
          windowStart,
          windowEnd: args.todayYmd,
          entryHash: hash,
          status: "ok",
          errorMessage: null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return mapAnalysis(upserted);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analysis failed";
    const merged = upsertFoodAnalysisOnError(prior, message);
    const [upserted] = await db
      .insert(foodAnalysis)
      .values({
        workspaceId: args.workspaceId,
        summary: merged.summary,
        suggestions: merged.suggestions,
        windowStart,
        windowEnd: args.todayYmd,
        entryHash: hash,
        status: "error",
        errorMessage: merged.errorMessage,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: foodAnalysis.workspaceId,
        set: {
          summary: merged.summary,
          suggestions: merged.suggestions,
          status: "error",
          errorMessage: merged.errorMessage,
          windowStart,
          windowEnd: args.todayYmd,
          entryHash: hash,
          updatedAt: new Date(),
        },
      })
      .returning();
    return mapAnalysis(upserted);
  }
}

export async function createFoodEntry(args: {
  workspaceId: string;
  userSub: string;
  loggedOn: string;
  foodType: FoodType;
  mealSlot?: MealSlot | null;
  note?: string | null;
  todayYmd: string;
  completeChat?: CompleteChat;
}): Promise<{ entry: FoodLogEntryDto; analysis: FoodAnalysisDto }> {
  const [row] = await db
    .insert(foodLogEntry)
    .values({
      workspaceId: args.workspaceId,
      loggedOn: args.loggedOn,
      foodType: args.foodType,
      mealSlot: args.mealSlot ?? null,
      note: args.note ?? null,
      createdByUserSub: args.userSub,
    })
    .returning();
  const analysis = await refreshFoodAnalysis({
    workspaceId: args.workspaceId,
    todayYmd: args.todayYmd,
    completeChat: args.completeChat,
  });
  return { entry: mapEntry(row), analysis };
}

export async function updateFoodEntry(args: {
  workspaceId: string;
  id: string;
  patch: {
    loggedOn?: string;
    foodType?: FoodType;
    mealSlot?: MealSlot | null;
    note?: string | null;
  };
  todayYmd: string;
  completeChat?: CompleteChat;
}): Promise<{ entry: FoodLogEntryDto; analysis: FoodAnalysisDto } | null> {
  const [row] = await db
    .update(foodLogEntry)
    .set({
      ...("loggedOn" in args.patch ? { loggedOn: args.patch.loggedOn } : {}),
      ...("foodType" in args.patch ? { foodType: args.patch.foodType } : {}),
      ...("mealSlot" in args.patch ? { mealSlot: args.patch.mealSlot ?? null } : {}),
      ...("note" in args.patch ? { note: args.patch.note ?? null } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(foodLogEntry.id, args.id),
        eq(foodLogEntry.workspaceId, args.workspaceId),
      ),
    )
    .returning();
  if (!row) return null;
  const analysis = await refreshFoodAnalysis({
    workspaceId: args.workspaceId,
    todayYmd: args.todayYmd,
    completeChat: args.completeChat,
  });
  return { entry: mapEntry(row), analysis };
}

export async function deleteFoodEntry(args: {
  workspaceId: string;
  id: string;
  todayYmd: string;
  completeChat?: CompleteChat;
}): Promise<{ analysis: FoodAnalysisDto } | null> {
  const deleted = await db
    .delete(foodLogEntry)
    .where(
      and(
        eq(foodLogEntry.id, args.id),
        eq(foodLogEntry.workspaceId, args.workspaceId),
      ),
    )
    .returning({ id: foodLogEntry.id });
  if (deleted.length === 0) return null;
  const analysis = await refreshFoodAnalysis({
    workspaceId: args.workspaceId,
    todayYmd: args.todayYmd,
    completeChat: args.completeChat,
  });
  return { analysis };
}

export function todayYmdLocal(timeZone = "UTC"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
