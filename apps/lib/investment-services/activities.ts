import { and, desc, eq, gte, lte, lt } from "drizzle-orm";
import { db } from "@/db";
import {
  investmentActivity,
  investmentInstrument,
} from "@/db/schema/investment";
import type {
  investmentActivitiesQuerySchema,
  investmentActivityCreateSchema,
  investmentActivityUpdateSchema,
} from "@/lib/validators/investment";
import type { z } from "zod";
import { getInvestmentInstrument } from "@/lib/investment-services/instruments";

export async function listInvestmentActivities(
  workspaceId: string,
  query: z.infer<typeof investmentActivitiesQuerySchema>,
) {
  const limit = query.limit ?? 50;
  const conditions = [eq(investmentActivity.workspaceId, workspaceId)];
  if (query.instrumentId) {
    conditions.push(eq(investmentActivity.instrumentId, query.instrumentId));
  }
  if (query.from) {
    conditions.push(gte(investmentActivity.activityDate, query.from));
  }
  if (query.to) {
    conditions.push(lte(investmentActivity.activityDate, query.to));
  }
  if (query.cursor) {
    conditions.push(lt(investmentActivity.id, query.cursor));
  }

  if (query.kind) {
    conditions.push(eq(investmentInstrument.kind, query.kind));
  }

  const rows = await db
    .select({
      id: investmentActivity.id,
      workspaceId: investmentActivity.workspaceId,
      instrumentId: investmentActivity.instrumentId,
      activityDate: investmentActivity.activityDate,
      type: investmentActivity.type,
      quantity: investmentActivity.quantity,
      unitPriceMinor: investmentActivity.unitPriceMinor,
      amountMinor: investmentActivity.amountMinor,
      notes: investmentActivity.notes,
      moneyAccountId: investmentActivity.moneyAccountId,
      moneyTransactionId: investmentActivity.moneyTransactionId,
      createdAt: investmentActivity.createdAt,
      updatedAt: investmentActivity.updatedAt,
      instrumentName: investmentInstrument.name,
      instrumentKind: investmentInstrument.kind,
      instrumentSymbol: investmentInstrument.symbol,
      instrumentCurrency: investmentInstrument.currency,
    })
    .from(investmentActivity)
    .innerJoin(
      investmentInstrument,
      eq(investmentInstrument.id, investmentActivity.instrumentId),
    )
    .where(and(...conditions))
    .orderBy(desc(investmentActivity.activityDate), desc(investmentActivity.id))
    .limit(limit + 1);

  const filtered = rows.filter(Boolean);
  const hasMore = filtered.length > limit;
  const items = hasMore ? filtered.slice(0, limit) : filtered;
  const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;
  return { items, nextCursor };
}

export async function getInvestmentActivity(workspaceId: string, id: string) {
  const [row] = await db
    .select()
    .from(investmentActivity)
    .where(
      and(
        eq(investmentActivity.id, id),
        eq(investmentActivity.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createInvestmentActivity(
  workspaceId: string,
  input: z.infer<typeof investmentActivityCreateSchema>,
) {
  const instrument = await getInvestmentInstrument(
    workspaceId,
    input.instrumentId,
  );
  if (!instrument) throw new Error("NOT_FOUND");

  const [row] = await db
    .insert(investmentActivity)
    .values({
      workspaceId,
      instrumentId: input.instrumentId,
      activityDate: input.activityDate,
      type: input.type,
      quantity: input.quantity ?? null,
      unitPriceMinor: input.unitPriceMinor ?? null,
      amountMinor: input.amountMinor ?? null,
      notes: input.notes ?? null,
      moneyAccountId: input.moneyAccountId ?? null,
      moneyTransactionId: input.moneyTransactionId ?? null,
    })
    .returning();
  return row!;
}

export async function updateInvestmentActivity(
  workspaceId: string,
  id: string,
  input: z.infer<typeof investmentActivityUpdateSchema>,
) {
  if (input.instrumentId) {
    const instrument = await getInvestmentInstrument(
      workspaceId,
      input.instrumentId,
    );
    if (!instrument) throw new Error("NOT_FOUND");
  }

  const [row] = await db
    .update(investmentActivity)
    .set({
      ...(input.instrumentId !== undefined
        ? { instrumentId: input.instrumentId }
        : {}),
      ...(input.activityDate !== undefined
        ? { activityDate: input.activityDate }
        : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
      ...(input.unitPriceMinor !== undefined
        ? { unitPriceMinor: input.unitPriceMinor }
        : {}),
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
      and(
        eq(investmentActivity.id, id),
        eq(investmentActivity.workspaceId, workspaceId),
      ),
    )
    .returning();
  if (!row) throw new Error("NOT_FOUND");
  return row;
}

export async function deleteInvestmentActivity(workspaceId: string, id: string) {
  const [row] = await db
    .delete(investmentActivity)
    .where(
      and(
        eq(investmentActivity.id, id),
        eq(investmentActivity.workspaceId, workspaceId),
      ),
    )
    .returning({ id: investmentActivity.id });
  if (!row) throw new Error("NOT_FOUND");
  return { ok: true as const };
}

export async function listWorkspaceInvestmentActivities(workspaceId: string) {
  return db
    .select()
    .from(investmentActivity)
    .where(eq(investmentActivity.workspaceId, workspaceId))
    .orderBy(investmentActivity.activityDate);
}
