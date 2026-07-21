import { and, desc, eq, gte, lte, lt } from "drizzle-orm";
import { db } from "@/db";
import { savingsActivity, savingsAccount } from "@/db/schema/savings";
import type {
  savingsActivitiesQuerySchema,
  savingsActivityCreateSchema,
  savingsActivityUpdateSchema,
} from "@/lib/validators/savings";
import type { z } from "zod";
import { getSavingsAccount } from "@/lib/savings-services/accounts";

export function signedActivityDelta(
  type: "deposit" | "withdraw" | "interest",
  amountMinor: number,
): number {
  if (type === "withdraw") return -amountMinor;
  return amountMinor;
}

export async function listSavingsActivities(
  workspaceId: string,
  query: z.infer<typeof savingsActivitiesQuerySchema>,
) {
  const limit = query.limit ?? 50;
  const conditions = [eq(savingsActivity.workspaceId, workspaceId)];
  if (query.accountId) {
    conditions.push(eq(savingsActivity.accountId, query.accountId));
  }
  if (query.from) {
    conditions.push(gte(savingsActivity.activityDate, query.from));
  }
  if (query.to) {
    conditions.push(lte(savingsActivity.activityDate, query.to));
  }
  if (query.cursor) {
    conditions.push(lt(savingsActivity.id, query.cursor));
  }

  const rows = await db
    .select({
      id: savingsActivity.id,
      workspaceId: savingsActivity.workspaceId,
      accountId: savingsActivity.accountId,
      activityDate: savingsActivity.activityDate,
      type: savingsActivity.type,
      amountMinor: savingsActivity.amountMinor,
      notes: savingsActivity.notes,
      moneyAccountId: savingsActivity.moneyAccountId,
      moneyTransactionId: savingsActivity.moneyTransactionId,
      createdAt: savingsActivity.createdAt,
      updatedAt: savingsActivity.updatedAt,
      accountName: savingsAccount.name,
      accountCurrency: savingsAccount.currency,
    })
    .from(savingsActivity)
    .innerJoin(savingsAccount, eq(savingsAccount.id, savingsActivity.accountId))
    .where(and(...conditions))
    .orderBy(desc(savingsActivity.activityDate), desc(savingsActivity.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;
  return { items, nextCursor };
}

export async function getSavingsActivity(workspaceId: string, id: string) {
  const [row] = await db
    .select()
    .from(savingsActivity)
    .where(
      and(eq(savingsActivity.id, id), eq(savingsActivity.workspaceId, workspaceId)),
    )
    .limit(1);
  return row ?? null;
}

export async function createSavingsActivity(
  workspaceId: string,
  input: z.infer<typeof savingsActivityCreateSchema>,
) {
  const account = await getSavingsAccount(workspaceId, input.accountId);
  if (!account) throw new Error("NOT_FOUND");

  const [row] = await db
    .insert(savingsActivity)
    .values({
      workspaceId,
      accountId: input.accountId,
      activityDate: input.activityDate,
      type: input.type,
      amountMinor: input.amountMinor,
      notes: input.notes ?? null,
      moneyAccountId: input.moneyAccountId ?? null,
      moneyTransactionId: input.moneyTransactionId ?? null,
    })
    .returning();
  return row!;
}

export async function updateSavingsActivity(
  workspaceId: string,
  id: string,
  input: z.infer<typeof savingsActivityUpdateSchema>,
) {
  if (input.accountId) {
    const account = await getSavingsAccount(workspaceId, input.accountId);
    if (!account) throw new Error("NOT_FOUND");
  }

  const [row] = await db
    .update(savingsActivity)
    .set({
      ...(input.accountId !== undefined ? { accountId: input.accountId } : {}),
      ...(input.activityDate !== undefined
        ? { activityDate: input.activityDate }
        : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.amountMinor !== undefined
        ? { amountMinor: input.amountMinor }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.moneyAccountId !== undefined
        ? { moneyAccountId: input.moneyAccountId }
        : {}),
      ...(input.moneyTransactionId !== undefined
        ? { moneyTransactionId: input.moneyTransactionId }
        : {}),
      updatedAt: new Date(),
    })
    .where(
      and(eq(savingsActivity.id, id), eq(savingsActivity.workspaceId, workspaceId)),
    )
    .returning();
  if (!row) throw new Error("NOT_FOUND");
  return row;
}

export async function deleteSavingsActivity(workspaceId: string, id: string) {
  const [row] = await db
    .delete(savingsActivity)
    .where(
      and(eq(savingsActivity.id, id), eq(savingsActivity.workspaceId, workspaceId)),
    )
    .returning({ id: savingsActivity.id });
  if (!row) throw new Error("NOT_FOUND");
  return { ok: true as const };
}

export async function computeSavingsTotalMinor(
  workspaceId: string,
  asOfDate?: string,
): Promise<number> {
  const conditions = [eq(savingsActivity.workspaceId, workspaceId)];
  if (asOfDate) {
    conditions.push(lte(savingsActivity.activityDate, asOfDate));
  }

  const rows = await db
    .select({
      type: savingsActivity.type,
      amountMinor: savingsActivity.amountMinor,
    })
    .from(savingsActivity)
    .where(and(...conditions));

  return rows.reduce(
    (sum, r) => sum + signedActivityDelta(r.type, r.amountMinor),
    0,
  );
}

export async function savingsBalanceSeries(
  workspaceId: string,
  from: string,
  to: string,
): Promise<{ date: string; totalMinor: number }[]> {
  const activities = await db
    .select({
      activityDate: savingsActivity.activityDate,
      type: savingsActivity.type,
      amountMinor: savingsActivity.amountMinor,
    })
    .from(savingsActivity)
    .where(
      and(
        eq(savingsActivity.workspaceId, workspaceId),
        lte(savingsActivity.activityDate, to),
      ),
    )
    .orderBy(savingsActivity.activityDate);

  const deltasByDate = new Map<string, number>();
  for (const a of activities) {
    const d = signedActivityDelta(a.type, a.amountMinor);
    deltasByDate.set(a.activityDate, (deltasByDate.get(a.activityDate) ?? 0) + d);
  }

  const out: { date: string; totalMinor: number }[] = [];
  let cursor = from;
  let running = 0;
  while (cursor <= to) {
    running += deltasByDate.get(cursor) ?? 0;
    out.push({ date: cursor, totalMinor: running });
    cursor = addDaysIso(cursor, 1);
  }
  return out;
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d! + days));
  return dt.toISOString().slice(0, 10);
}
