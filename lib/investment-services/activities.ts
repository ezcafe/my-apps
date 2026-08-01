import { and, desc, eq, gte, lte, lt } from "drizzle-orm";
import { db } from "@/db";
import {
  moneyAccount,
  moneyTransaction,
  moneyTransactionInvestment,
} from "@/db/schema/money";
import { investmentInstrument } from "@/db/schema/investment";
import type {
  investmentActivitiesQuerySchema,
  investmentActivityCreateSchema,
  investmentActivityUpdateSchema,
} from "@/lib/validators/investment";
import type { z } from "zod";
import { getInvestmentInstrument } from "@/lib/investment-services/instruments";
import {
  activityDateToOccurredAt,
  investmentActivityTypeToTransactionKind,
  occurredAtToActivityDate,
  type MoneyInvestmentActivityType,
} from "@/lib/money-investment-activity";
import type { MoneyWorkspaceCtx } from "@/lib/money-services/types";

export type InvestmentActivityRow = {
  id: string;
  instrumentId: string;
  instrumentName: string;
  instrumentKind: string;
  instrumentSymbol: string;
  instrumentCurrency: string;
  activityDate: string;
  type: string;
  quantity: string | null;
  unitPriceMinor: number | null;
  amountMinor: number | null;
  notes: string | null;
  moneyAccountId: string | null;
  moneyTransactionId: string | null;
};

function mapJoinedRow(row: {
  id: string;
  accountId: string;
  amountMinor: number;
  notes: string | null;
  occurredAt: Date;
  activityType: MoneyInvestmentActivityType;
  quantity: string | null;
  unitPriceMinor: number | null;
  instrumentId: string;
  instrumentName: string;
  instrumentKind: string;
  instrumentSymbol: string;
  instrumentCurrency: string;
}): InvestmentActivityRow {
  return {
    id: row.id,
    instrumentId: row.instrumentId,
    instrumentName: row.instrumentName,
    instrumentKind: row.instrumentKind,
    instrumentSymbol: row.instrumentSymbol,
    instrumentCurrency: row.instrumentCurrency,
    activityDate: occurredAtToActivityDate(row.occurredAt),
    type: row.activityType,
    quantity: row.quantity,
    unitPriceMinor: row.unitPriceMinor,
    amountMinor: row.amountMinor,
    notes: row.notes,
    moneyAccountId: row.accountId,
    moneyTransactionId: row.id,
  };
}

export async function listInvestmentActivities(
  workspaceId: string,
  query: z.infer<typeof investmentActivitiesQuerySchema>,
): Promise<{ items: InvestmentActivityRow[]; nextCursor: string | null }> {
  const limit = query.limit ?? 50;
  const conditions = [eq(moneyTransaction.workspaceId, workspaceId)];
  if (query.instrumentId) {
    conditions.push(eq(moneyTransactionInvestment.instrumentId, query.instrumentId));
  }
  if (query.from) {
    conditions.push(
      gte(moneyTransaction.occurredAt, activityDateToOccurredAt(query.from)),
    );
  }
  if (query.to) {
    conditions.push(
      lte(moneyTransaction.occurredAt, activityDateToOccurredAt(query.to)),
    );
  }
  if (query.cursor) {
    conditions.push(lt(moneyTransaction.id, query.cursor));
  }
  if (query.kind) {
    conditions.push(eq(investmentInstrument.kind, query.kind));
  }

  const rows = await db
    .select({
      id: moneyTransaction.id,
      accountId: moneyTransaction.accountId,
      amountMinor: moneyTransaction.amountMinor,
      notes: moneyTransaction.notes,
      occurredAt: moneyTransaction.occurredAt,
      activityType: moneyTransactionInvestment.activityType,
      quantity: moneyTransactionInvestment.quantity,
      unitPriceMinor: moneyTransactionInvestment.unitPriceMinor,
      instrumentId: moneyTransactionInvestment.instrumentId,
      instrumentName: investmentInstrument.name,
      instrumentKind: investmentInstrument.kind,
      instrumentSymbol: investmentInstrument.symbol,
      instrumentCurrency: investmentInstrument.currency,
    })
    .from(moneyTransactionInvestment)
    .innerJoin(
      moneyTransaction,
      eq(moneyTransaction.id, moneyTransactionInvestment.transactionId),
    )
    .innerJoin(
      investmentInstrument,
      eq(investmentInstrument.id, moneyTransactionInvestment.instrumentId),
    )
    .where(and(...conditions))
    .orderBy(desc(moneyTransaction.occurredAt), desc(moneyTransaction.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const items = slice.map(mapJoinedRow);
  const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;
  return { items, nextCursor };
}

export async function getInvestmentActivity(workspaceId: string, id: string) {
  const rows = await db
    .select({
      id: moneyTransaction.id,
      accountId: moneyTransaction.accountId,
      amountMinor: moneyTransaction.amountMinor,
      notes: moneyTransaction.notes,
      occurredAt: moneyTransaction.occurredAt,
      activityType: moneyTransactionInvestment.activityType,
      quantity: moneyTransactionInvestment.quantity,
      unitPriceMinor: moneyTransactionInvestment.unitPriceMinor,
      instrumentId: moneyTransactionInvestment.instrumentId,
      instrumentName: investmentInstrument.name,
      instrumentKind: investmentInstrument.kind,
      instrumentSymbol: investmentInstrument.symbol,
      instrumentCurrency: investmentInstrument.currency,
    })
    .from(moneyTransactionInvestment)
    .innerJoin(
      moneyTransaction,
      eq(moneyTransaction.id, moneyTransactionInvestment.transactionId),
    )
    .innerJoin(
      investmentInstrument,
      eq(investmentInstrument.id, moneyTransactionInvestment.instrumentId),
    )
    .where(
      and(
        eq(moneyTransaction.id, id),
        eq(moneyTransaction.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  const row = rows[0];
  return row ? mapJoinedRow(row) : null;
}

async function resolveInvestmentCashAccountId(
  workspaceId: string,
  instrumentId: string,
  explicitAccountId: string | null | undefined,
): Promise<string> {
  if (explicitAccountId) {
    const [acc] = await db
      .select({ id: moneyAccount.id })
      .from(moneyAccount)
      .where(
        and(
          eq(moneyAccount.id, explicitAccountId),
          eq(moneyAccount.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    if (!acc) throw new Error("NOT_FOUND");
    return acc.id;
  }
  const instrument = await getInvestmentInstrument(workspaceId, instrumentId);
  if (!instrument) throw new Error("NOT_FOUND");
  const [acc] = await db
    .select({ id: moneyAccount.id })
    .from(moneyAccount)
    .where(
      and(
        eq(moneyAccount.workspaceId, workspaceId),
        eq(moneyAccount.type, "investment"),
        eq(moneyAccount.currency, instrument.currency),
      ),
    )
    .limit(1);
  if (!acc) {
    throw new Error(
      "No investment money account for this currency; create one under Settings → Accounts",
    );
  }
  return acc.id;
}

export async function createInvestmentActivity(
  workspaceId: string,
  userSub: string,
  input: z.infer<typeof investmentActivityCreateSchema>,
) {
  const instrument = await getInvestmentInstrument(
    workspaceId,
    input.instrumentId,
  );
  if (!instrument) throw new Error("NOT_FOUND");

  const activityType = input.type as MoneyInvestmentActivityType;
  const kind = investmentActivityTypeToTransactionKind(activityType);
  const amountMinor = input.amountMinor ?? 0;
  if (amountMinor <= 0) throw new Error("amountMinor must be positive");

  const accountId = await resolveInvestmentCashAccountId(
    workspaceId,
    input.instrumentId,
    input.moneyAccountId,
  );

  const [tx] = await db
    .insert(moneyTransaction)
    .values({
      workspaceId,
      accountId,
      kind,
      amountMinor,
      occurredAt: activityDateToOccurredAt(input.activityDate),
      notes: input.notes ?? null,
      createdBySub: userSub,
    })
    .returning();

  await db.insert(moneyTransactionInvestment).values({
    transactionId: tx!.id,
    instrumentId: input.instrumentId,
    activityType,
    quantity: input.quantity ?? null,
    unitPriceMinor: input.unitPriceMinor ?? null,
  });

  return getInvestmentActivity(workspaceId, tx!.id);
}

export async function updateInvestmentActivity(
  workspaceId: string,
  id: string,
  input: z.infer<typeof investmentActivityUpdateSchema>,
) {
  const existing = await getInvestmentActivity(workspaceId, id);
  if (!existing) throw new Error("NOT_FOUND");

  if (input.instrumentId) {
    const instrument = await getInvestmentInstrument(
      workspaceId,
      input.instrumentId,
    );
    if (!instrument) throw new Error("NOT_FOUND");
  }

  const activityType = (input.type ??
    existing.type) as MoneyInvestmentActivityType;
  const kind = investmentActivityTypeToTransactionKind(activityType);

  await db
    .update(moneyTransaction)
    .set({
      ...(input.amountMinor != null
        ? { amountMinor: input.amountMinor }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
      ...(input.activityDate !== undefined
        ? { occurredAt: activityDateToOccurredAt(input.activityDate) }
        : {}),
      kind,
      updatedAt: new Date(),
      ...(input.moneyAccountId !== undefined
        ? { accountId: input.moneyAccountId! }
        : {}),
    })
    .where(
      and(eq(moneyTransaction.id, id), eq(moneyTransaction.workspaceId, workspaceId)),
    );

  await db
    .update(moneyTransactionInvestment)
    .set({
      ...(input.instrumentId !== undefined
        ? { instrumentId: input.instrumentId }
        : {}),
      ...(input.type !== undefined ? { activityType: activityType } : {}),
      ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
      ...(input.unitPriceMinor !== undefined
        ? { unitPriceMinor: input.unitPriceMinor }
        : {}),
    })
    .where(eq(moneyTransactionInvestment.transactionId, id));

  return getInvestmentActivity(workspaceId, id);
}

export async function deleteInvestmentActivity(
  workspaceId: string,
  id: string,
): Promise<void> {
  const deleted = await db
    .delete(moneyTransaction)
    .where(
      and(eq(moneyTransaction.id, id), eq(moneyTransaction.workspaceId, workspaceId)),
    )
    .returning({ id: moneyTransaction.id });
  if (!deleted.length) throw new Error("NOT_FOUND");
}

/** All investment ledger rows for portfolio math (unordered). */
export async function listWorkspaceInvestmentActivities(workspaceId: string) {
  const { items } = await listInvestmentActivities(workspaceId, { limit: 10_000 });
  return items.map((a) => ({
    instrumentId: a.instrumentId,
    activityDate: a.activityDate,
    type: a.type as MoneyInvestmentActivityType,
    quantity: a.quantity,
  }));
}

export async function createInvestmentActivityWithCtx(
  ctx: MoneyWorkspaceCtx,
  input: z.infer<typeof investmentActivityCreateSchema>,
) {
  const row = await createInvestmentActivity(ctx.workspaceId, ctx.userSub, input);
  if (!row) throw new Error("NOT_FOUND");
  return row;
}
