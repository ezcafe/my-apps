import { and, asc, desc, eq, gte, lte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  moneyAccount,
  moneyTransaction,
  moneyTransactionInvestment,
} from "@/db/schema/money";
import {
  investmentInstrument,
  investmentTradeJournal,
} from "@/db/schema/investment";
import type {
  investmentActivitiesQuerySchema,
  investmentActivityCashMoveSchema,
  investmentActivityCloseSchema,
  investmentActivityCreateSchema,
  investmentActivityRealizeSchema,
  investmentActivityUpdateSchema,
} from "@/lib/validators/investment";
import type { z } from "zod";
import { workspace } from "@/db/schema/workspace";
import { preferredInvestmentCashAccountId } from "@/lib/investment-cash-account";
import { instrumentLedgerPrefill } from "@/lib/instrument-ledger-prefill";
import { getInvestmentInstrument } from "@/lib/investment-services/instruments";
import { fetchInvestmentFxRate } from "@/lib/investment-services/quotes";
import {
  activityDateToOccurredAt,
  occurredAtToActivityDate,
  type MoneyInvestmentActivityType,
} from "@/lib/money-investment-activity";
import { parseMajorToMinor } from "@/lib/format-money";
import { parseQuantity, formatQuantityDisplay } from "@/lib/investment-services/positions";
import {
  cashMoveSignedMinor,
  parsePriceMajor,
  realizeNetPnl,
  signedPnlToLedger,
} from "@/lib/investment-realized-pnl";
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
  openPrice: string | null;
  closePrice: string | null;
  stopLoss: string | null;
  takeProfit: string | null;
  amountMinor: number | null;
  notes: string | null;
  moneyAccountId: string | null;
  moneyTransactionId: string | null;
  status: string | null;
};

function mapJournalRow(row: {
  id: string;
  moneyAccountId: string;
  notes: string | null;
  activityDate: string;
  activityType: "buy" | "sell";
  quantity: string;
  openPrice: string;
  closePrice: string | null;
  stopLoss: string | null;
  takeProfit: string | null;
  commissionMinor: number;
  closeFeeMinor: number | null;
  realizedPnlMinor: number | null;
  closedTransactionId: string | null;
  status: "open" | "closed";
  instrumentId: string;
  instrumentName: string;
  instrumentKind: string;
  instrumentSymbol: string;
  instrumentCurrency: string;
}): InvestmentActivityRow {
  const booked =
    row.realizedPnlMinor != null ? Math.abs(row.realizedPnlMinor) : row.commissionMinor;
  return {
    id: row.id,
    instrumentId: row.instrumentId,
    instrumentName: row.instrumentName,
    instrumentKind: row.instrumentKind,
    instrumentSymbol: row.instrumentSymbol,
    instrumentCurrency: row.instrumentCurrency,
    activityDate: row.activityDate,
    type: row.activityType,
    quantity: formatQuantityDisplay(row.quantity) || null,
    unitPriceMinor: parseMajorToMinor(row.openPrice, row.instrumentCurrency),
    openPrice: row.openPrice,
    closePrice: row.closePrice,
    stopLoss: row.stopLoss,
    takeProfit: row.takeProfit,
    amountMinor: booked,
    notes: row.notes,
    moneyAccountId: row.moneyAccountId,
    moneyTransactionId: row.closedTransactionId,
    status: row.status,
  };
}

function mapCashRow(row: {
  id: string;
  accountId: string;
  amountMinor: number;
  notes: string | null;
  occurredAt: Date;
  activityType: MoneyInvestmentActivityType;
  quantity: string | null;
  unitPriceMinor: number | null;
  openPrice: string | null;
  stopLoss: string | null;
  takeProfit: string | null;
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
    quantity: formatQuantityDisplay(row.quantity) || null,
    unitPriceMinor: row.unitPriceMinor,
    openPrice: row.openPrice,
    closePrice: null,
    stopLoss: row.stopLoss,
    takeProfit: row.takeProfit,
    amountMinor: row.amountMinor,
    notes: row.notes,
    moneyAccountId: row.accountId,
    moneyTransactionId: row.id,
    status: "booked",
  };
}

const journalSelect = {
  id: investmentTradeJournal.id,
  moneyAccountId: investmentTradeJournal.moneyAccountId,
  notes: investmentTradeJournal.notes,
  activityDate: investmentTradeJournal.activityDate,
  activityType: investmentTradeJournal.activityType,
  quantity: investmentTradeJournal.quantity,
  openPrice: investmentTradeJournal.openPrice,
  closePrice: investmentTradeJournal.closePrice,
  stopLoss: investmentTradeJournal.stopLoss,
  takeProfit: investmentTradeJournal.takeProfit,
  commissionMinor: investmentTradeJournal.commissionMinor,
  closeFeeMinor: investmentTradeJournal.closeFeeMinor,
  realizedPnlMinor: investmentTradeJournal.realizedPnlMinor,
  closedTransactionId: investmentTradeJournal.closedTransactionId,
  status: investmentTradeJournal.status,
  instrumentId: investmentTradeJournal.instrumentId,
  instrumentName: investmentInstrument.name,
  instrumentKind: investmentInstrument.kind,
  instrumentSymbol: investmentInstrument.symbol,
  instrumentCurrency: investmentInstrument.currency,
};

async function resolveInvestmentCashAccountId(
  workspaceId: string,
  instrumentId: string,
  explicitAccountId: string | null | undefined,
): Promise<string> {
  const instrument = await getInvestmentInstrument(workspaceId, instrumentId);
  if (!instrument) throw new Error("NOT_FOUND");
  const preferred = preferredInvestmentCashAccountId(
    explicitAccountId,
    instrument.moneyAccountId,
  );
  if (preferred) {
    const [acc] = await db
      .select({ id: moneyAccount.id })
      .from(moneyAccount)
      .where(
        and(
          eq(moneyAccount.id, preferred),
          eq(moneyAccount.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    if (!acc) throw new Error("NOT_FOUND");
    return acc.id;
  }
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
      "This symbol has no account. Set one under Investments settings.",
    );
  }
  return acc.id;
}

const TOP_QUANTITIES_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

export async function listInvestmentTopQuantities(
  workspaceId: string,
  limit = 3,
) {
  const since = new Date(Date.now() - TOP_QUANTITIES_WINDOW_MS);
  const sinceDate = since.toISOString().slice(0, 10);
  const rows = await db
    .select({
      quantity: investmentTradeJournal.quantity,
      usageCount: sql<number>`count(*)::int`.as("usage_count"),
    })
    .from(investmentTradeJournal)
    .where(
      and(
        eq(investmentTradeJournal.workspaceId, workspaceId),
        gte(investmentTradeJournal.activityDate, sinceDate),
      ),
    )
    .groupBy(investmentTradeJournal.quantity)
    .orderBy(desc(sql`usage_count`), asc(investmentTradeJournal.quantity))
    .limit(limit);
  return rows.map((row) => ({
    quantity: formatQuantityDisplay(row.quantity),
    usageCount: row.usageCount,
  }));
}

export async function listOpenInvestmentActivities(
  workspaceId: string,
  instrumentId?: string,
): Promise<InvestmentActivityRow[]> {
  const conditions = [
    eq(investmentTradeJournal.workspaceId, workspaceId),
    eq(investmentTradeJournal.status, "open"),
  ];
  if (instrumentId) {
    conditions.push(eq(investmentTradeJournal.instrumentId, instrumentId));
  }
  const rows = await db
    .select(journalSelect)
    .from(investmentTradeJournal)
    .innerJoin(
      investmentInstrument,
      eq(investmentInstrument.id, investmentTradeJournal.instrumentId),
    )
    .where(and(...conditions))
    .orderBy(desc(investmentTradeJournal.activityDate), desc(investmentTradeJournal.id));
  return rows.map(mapJournalRow);
}

export async function listInvestmentActivities(
  workspaceId: string,
  query: z.infer<typeof investmentActivitiesQuerySchema>,
): Promise<{ items: InvestmentActivityRow[]; nextCursor: string | null }> {
  const limit = query.limit ?? 50;
  const journalConditions = [eq(investmentTradeJournal.workspaceId, workspaceId)];
  if (query.instrumentId) {
    journalConditions.push(
      eq(investmentTradeJournal.instrumentId, query.instrumentId),
    );
  }
  if (query.from) {
    journalConditions.push(gte(investmentTradeJournal.activityDate, query.from));
  }
  if (query.to) {
    journalConditions.push(lte(investmentTradeJournal.activityDate, query.to));
  }
  if (query.status) {
    journalConditions.push(eq(investmentTradeJournal.status, query.status));
  }
  if (query.kind) {
    journalConditions.push(eq(investmentInstrument.kind, query.kind));
  }
  if (query.cursor) {
    journalConditions.push(lt(investmentTradeJournal.id, query.cursor));
  }

  const journalRows = await db
    .select(journalSelect)
    .from(investmentTradeJournal)
    .innerJoin(
      investmentInstrument,
      eq(investmentInstrument.id, investmentTradeJournal.instrumentId),
    )
    .where(and(...journalConditions))
    .orderBy(desc(investmentTradeJournal.activityDate), desc(investmentTradeJournal.id))
    .limit(limit + 1);

  const cashConditions = [eq(moneyTransaction.workspaceId, workspaceId)];
  if (query.instrumentId) {
    cashConditions.push(
      eq(moneyTransactionInvestment.instrumentId, query.instrumentId),
    );
  }
  if (query.from) {
    cashConditions.push(
      gte(moneyTransaction.occurredAt, activityDateToOccurredAt(query.from)),
    );
  }
  if (query.to) {
    cashConditions.push(
      lte(moneyTransaction.occurredAt, activityDateToOccurredAt(query.to)),
    );
  }
  if (query.kind) {
    cashConditions.push(eq(investmentInstrument.kind, query.kind));
  }
  if (query.cursor) {
    cashConditions.push(lt(moneyTransaction.id, query.cursor));
  }

  const closedLinkRows = await db
    .select({
      closedTransactionId: investmentTradeJournal.closedTransactionId,
    })
    .from(investmentTradeJournal)
    .where(eq(investmentTradeJournal.workspaceId, workspaceId));
  const closedIds = new Set(
    closedLinkRows
      .map((r) => r.closedTransactionId)
      .filter((id): id is string => Boolean(id)),
  );

  const cashRows = await db
    .select({
      id: moneyTransaction.id,
      accountId: moneyTransaction.accountId,
      amountMinor: moneyTransaction.amountMinor,
      notes: moneyTransaction.notes,
      occurredAt: moneyTransaction.occurredAt,
      activityType: moneyTransactionInvestment.activityType,
      quantity: moneyTransactionInvestment.quantity,
      unitPriceMinor: moneyTransactionInvestment.unitPriceMinor,
      openPrice: moneyTransactionInvestment.openPrice,
      stopLoss: moneyTransactionInvestment.stopLoss,
      takeProfit: moneyTransactionInvestment.takeProfit,
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
    .where(and(...cashConditions))
    .orderBy(desc(moneyTransaction.occurredAt), desc(moneyTransaction.id))
    .limit(limit + 1);

  const cashMapped = cashRows
    .filter((r) => !closedIds.has(r.id))
    .filter(
      (r) => r.activityType === "deposit" || r.activityType === "withdraw",
    )
    .map(mapCashRow);

  const merged = [...journalRows.map(mapJournalRow), ...cashMapped].sort((a, b) => {
    const byDate = b.activityDate.localeCompare(a.activityDate);
    if (byDate !== 0) return byDate;
    return b.id.localeCompare(a.id);
  });

  const hasMore = merged.length > limit;
  const slice = hasMore ? merged.slice(0, limit) : merged;
  const nextCursor = hasMore ? slice[slice.length - 1]?.id ?? null : null;
  return { items: slice, nextCursor };
}

export async function getInvestmentActivity(workspaceId: string, id: string) {
  const journal = await db
    .select(journalSelect)
    .from(investmentTradeJournal)
    .innerJoin(
      investmentInstrument,
      eq(investmentInstrument.id, investmentTradeJournal.instrumentId),
    )
    .where(
      and(
        eq(investmentTradeJournal.id, id),
        eq(investmentTradeJournal.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  if (journal[0]) return mapJournalRow(journal[0]);

  const cashRows = await db
    .select({
      id: moneyTransaction.id,
      accountId: moneyTransaction.accountId,
      amountMinor: moneyTransaction.amountMinor,
      notes: moneyTransaction.notes,
      occurredAt: moneyTransaction.occurredAt,
      activityType: moneyTransactionInvestment.activityType,
      quantity: moneyTransactionInvestment.quantity,
      unitPriceMinor: moneyTransactionInvestment.unitPriceMinor,
      openPrice: moneyTransactionInvestment.openPrice,
      stopLoss: moneyTransactionInvestment.stopLoss,
      takeProfit: moneyTransactionInvestment.takeProfit,
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
  return cashRows[0] ? mapCashRow(cashRows[0]) : null;
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

  const accountId = await resolveInvestmentCashAccountId(
    workspaceId,
    input.instrumentId,
    input.moneyAccountId,
  );

  const [row] = await db
    .insert(investmentTradeJournal)
    .values({
      workspaceId,
      instrumentId: input.instrumentId,
      moneyAccountId: accountId,
      categoryId: input.categoryId ?? null,
      activityType: input.type,
      quantity: input.quantity!.trim(),
      openPrice: input.openPrice!.trim(),
      stopLoss: input.stopLoss?.trim() || null,
      takeProfit: input.takeProfit?.trim() || null,
      commissionMinor: input.amountMinor ?? 0,
      activityDate: input.activityDate,
      notes: input.notes ?? null,
      status: "open",
      createdBySub: userSub,
    })
    .returning({ id: investmentTradeJournal.id });

  const created = await getInvestmentActivity(workspaceId, row!.id);
  if (!created) throw new Error("NOT_FOUND");
  return created;
}

async function insertClosedLedger(opts: {
  workspaceId: string;
  userSub: string;
  accountId: string;
  categoryId: string | null;
  notes: string | null;
  activityDate: string;
  instrumentId: string;
  activityType: MoneyInvestmentActivityType;
  openPrice: string | null;
  quantity: string | null;
  signedPnlMinor: number;
  currency: string;
  stopLoss?: string | null;
  takeProfit?: string | null;
}) {
  const ledger = signedPnlToLedger(opts.signedPnlMinor);
  const [tx] = await db
    .insert(moneyTransaction)
    .values({
      workspaceId: opts.workspaceId,
      accountId: opts.accountId,
      kind: ledger.kind,
      amountMinor: ledger.amountMinor,
      occurredAt: activityDateToOccurredAt(opts.activityDate),
      notes: opts.notes,
      categoryId: opts.categoryId,
      createdBySub: opts.userSub,
    })
    .returning();

  await db.insert(moneyTransactionInvestment).values({
    transactionId: tx!.id,
    instrumentId: opts.instrumentId,
    activityType: opts.activityType,
    quantity: "0",
    unitPriceMinor: opts.openPrice
      ? parseMajorToMinor(opts.openPrice, opts.currency)
      : null,
    openPrice: opts.openPrice,
    stopLoss: opts.stopLoss ?? null,
    takeProfit: opts.takeProfit ?? null,
  });

  return tx!.id;
}

async function workspaceDefaultCurrency(workspaceId: string): Promise<string> {
  const [ws] = await db
    .select({ defaultCurrency: workspace.defaultCurrency })
    .from(workspace)
    .where(eq(workspace.id, workspaceId))
    .limit(1);
  const code = ws?.defaultCurrency?.trim().toUpperCase();
  if (!code) throw new Error("Set a workspace currency first");
  return code;
}

async function resolveCloseFxRate(
  priceCurrency: string,
  workspaceCurrency: string,
  explicitRate: number | null | undefined,
): Promise<number> {
  if (explicitRate != null) return explicitRate;
  if (priceCurrency === workspaceCurrency) return 1;
  const quote = await fetchInvestmentFxRate(priceCurrency, workspaceCurrency);
  if (quote?.rate == null || !(quote.rate > 0)) {
    throw new Error("Enter a positive FX rate to the workspace currency.");
  }
  return quote.rate;
}

export async function closeInvestmentActivity(
  workspaceId: string,
  userSub: string,
  input: z.infer<typeof investmentActivityCloseSchema>,
) {
  const existing = await db
    .select()
    .from(investmentTradeJournal)
    .where(
      and(
        eq(investmentTradeJournal.id, input.id),
        eq(investmentTradeJournal.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  const row = existing[0];
  if (!row) throw new Error("NOT_FOUND");
  if (row.status === "closed") throw new Error("Activity is already closed");

  const instrument = await getInvestmentInstrument(workspaceId, row.instrumentId);
  if (!instrument) throw new Error("NOT_FOUND");

  const lots = parseQuantity(row.quantity);
  const open = parsePriceMajor(row.openPrice);
  const close = parsePriceMajor(input.closePrice);
  if (open == null || close == null) throw new Error("Invalid prices");

  const feeMinor = input.feeMinor ?? 0;
  const priceCurrency = instrument.currency.trim().toUpperCase();
  const workspaceCurrency = await workspaceDefaultCurrency(workspaceId);
  const fxRate = await resolveCloseFxRate(
    priceCurrency,
    workspaceCurrency,
    input.fxRate,
  );
  const { netMinor: net } = realizeNetPnl({
    side: row.activityType,
    lots,
    contractSize: instrument.contractSize,
    openPrice: open,
    closePrice: close,
    closeFeeMinor: feeMinor,
    openCommissionMinor: row.commissionMinor,
    priceCurrency,
    workspaceCurrency,
    fxRate,
  });
  const activityDate = input.activityDate ?? occurredAtToActivityDate(new Date());
  const ledgerPrefill = instrumentLedgerPrefill(
    {
      moneyAccountId: instrument.moneyAccountId,
      incomeCategoryId: instrument.incomeCategoryId,
      expenseCategoryId: instrument.expenseCategoryId,
    },
    net,
  );
  const accountId =
    input.moneyAccountId ?? ledgerPrefill.accountId ?? row.moneyAccountId;
  const categoryId =
    input.categoryId ?? ledgerPrefill.categoryId ?? row.categoryId ?? null;

  const txId = await insertClosedLedger({
    workspaceId,
    userSub,
    accountId,
    categoryId,
    notes: input.notes !== undefined ? input.notes : row.notes,
    activityDate,
    instrumentId: row.instrumentId,
    activityType: row.activityType,
    openPrice: row.openPrice,
    quantity: "0",
    signedPnlMinor: net,
    stopLoss: row.stopLoss,
    takeProfit: row.takeProfit,
    currency: instrument.currency,
  });

  await db
    .update(investmentTradeJournal)
    .set({
      status: "closed",
      closePrice: input.closePrice.trim(),
      closeFeeMinor: feeMinor,
      closedAt: activityDateToOccurredAt(activityDate),
      realizedPnlMinor: net,
      closedTransactionId: txId,
      notes: input.notes !== undefined ? input.notes : row.notes,
      updatedAt: new Date(),
    })
    .where(eq(investmentTradeJournal.id, row.id));

  const updated = await getInvestmentActivity(workspaceId, row.id);
  if (!updated) throw new Error("NOT_FOUND");
  return updated;
}

export async function createRealizedInvestmentActivity(
  workspaceId: string,
  userSub: string,
  input: z.infer<typeof investmentActivityRealizeSchema>,
) {
  const instrument = await getInvestmentInstrument(
    workspaceId,
    input.instrumentId,
  );
  if (!instrument) throw new Error("NOT_FOUND");

  const accountId = await resolveInvestmentCashAccountId(
    workspaceId,
    input.instrumentId,
    input.moneyAccountId,
  );

  const side = input.type;
  const lots = parseQuantity(input.quantity);
  const open = parsePriceMajor(input.openPrice);
  const close = parsePriceMajor(input.closePrice);
  if (open == null || close == null) throw new Error("Invalid prices");

  const feeMinor = input.feeMinor ?? 0;
  const priceCurrency = input.priceCurrency;
  const workspaceCurrency = await workspaceDefaultCurrency(workspaceId);
  const { netMinor: net } = realizeNetPnl({
    side,
    lots,
    contractSize: instrument.contractSize,
    openPrice: open,
    closePrice: close,
    closeFeeMinor: feeMinor,
    openCommissionMinor: 0,
    priceCurrency,
    workspaceCurrency,
    fxRate: input.fxRate,
  });

  const txId = await insertClosedLedger({
    workspaceId,
    userSub,
    accountId,
    categoryId: input.categoryId ?? null,
    notes: input.notes ?? null,
    activityDate: input.activityDate,
    instrumentId: input.instrumentId,
    activityType: side,
    openPrice: input.openPrice.trim(),
    quantity: "0",
    signedPnlMinor: net,
    currency: priceCurrency,
  });

  const [row] = await db
    .insert(investmentTradeJournal)
    .values({
      workspaceId,
      instrumentId: input.instrumentId,
      moneyAccountId: accountId,
      categoryId: input.categoryId ?? null,
      activityType: side,
      quantity: input.quantity.trim(),
      openPrice: input.openPrice.trim(),
      closePrice: input.closePrice.trim(),
      commissionMinor: 0,
      closeFeeMinor: feeMinor,
      activityDate: input.activityDate,
      notes: input.notes ?? null,
      status: "closed",
      closedAt: activityDateToOccurredAt(input.activityDate),
      realizedPnlMinor: net,
      closedTransactionId: txId,
      createdBySub: userSub,
    })
    .returning({ id: investmentTradeJournal.id });

  const created = await getInvestmentActivity(workspaceId, row!.id);
  if (!created) throw new Error("NOT_FOUND");
  return created;
}

export async function createInvestmentCashMove(
  workspaceId: string,
  userSub: string,
  input: z.infer<typeof investmentActivityCashMoveSchema>,
) {
  const instrument = await getInvestmentInstrument(
    workspaceId,
    input.instrumentId,
  );
  if (!instrument) throw new Error("NOT_FOUND");

  const accountId = await resolveInvestmentCashAccountId(
    workspaceId,
    input.instrumentId,
    input.moneyAccountId,
  );

  const signed = cashMoveSignedMinor(
    input.type,
    input.amountMinor,
    input.feeMinor ?? 0,
  );
  const txId = await insertClosedLedger({
    workspaceId,
    userSub,
    accountId,
    categoryId: input.categoryId ?? null,
    notes: input.notes ?? null,
    activityDate: input.activityDate,
    instrumentId: input.instrumentId,
    activityType: input.type,
    openPrice: null,
    quantity: "0",
    signedPnlMinor: signed,
    currency: instrument.currency,
  });

  const row = await getInvestmentActivity(workspaceId, txId);
  if (!row) throw new Error("NOT_FOUND");
  return row;
}

export async function updateInvestmentActivity(
  workspaceId: string,
  id: string,
  input: z.infer<typeof investmentActivityUpdateSchema>,
) {
  const existing = await getInvestmentActivity(workspaceId, id);
  if (!existing) throw new Error("NOT_FOUND");
  if (existing.status !== "open") {
    throw new Error("Only open activities can be updated");
  }

  if (input.instrumentId) {
    const instrument = await getInvestmentInstrument(
      workspaceId,
      input.instrumentId,
    );
    if (!instrument) throw new Error("NOT_FOUND");
  }

  await db
    .update(investmentTradeJournal)
    .set({
      ...(input.instrumentId !== undefined
        ? { instrumentId: input.instrumentId }
        : {}),
      ...(input.type !== undefined ? { activityType: input.type } : {}),
      ...(input.quantity !== undefined && input.quantity
        ? { quantity: input.quantity }
        : {}),
      ...(input.openPrice !== undefined && input.openPrice
        ? { openPrice: input.openPrice.trim() }
        : {}),
      ...(input.stopLoss !== undefined
        ? { stopLoss: input.stopLoss?.trim() || null }
        : {}),
      ...(input.takeProfit !== undefined
        ? { takeProfit: input.takeProfit?.trim() || null }
        : {}),
      ...(input.amountMinor != null ? { commissionMinor: input.amountMinor } : {}),
      ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
      ...(input.activityDate !== undefined
        ? { activityDate: input.activityDate }
        : {}),
      ...(input.moneyAccountId !== undefined && input.moneyAccountId
        ? { moneyAccountId: input.moneyAccountId }
        : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(investmentTradeJournal.id, id),
        eq(investmentTradeJournal.workspaceId, workspaceId),
      ),
    );

  const updated = await getInvestmentActivity(workspaceId, id);
  if (!updated) throw new Error("NOT_FOUND");
  return updated;
}

export async function deleteInvestmentActivity(
  workspaceId: string,
  id: string,
): Promise<void> {
  const journalDeleted = await db
    .delete(investmentTradeJournal)
    .where(
      and(
        eq(investmentTradeJournal.id, id),
        eq(investmentTradeJournal.workspaceId, workspaceId),
        eq(investmentTradeJournal.status, "open"),
      ),
    )
    .returning({ id: investmentTradeJournal.id });
  if (journalDeleted.length) return;

  const deleted = await db
    .delete(moneyTransaction)
    .where(
      and(eq(moneyTransaction.id, id), eq(moneyTransaction.workspaceId, workspaceId)),
    )
    .returning({ id: moneyTransaction.id });
  if (!deleted.length) throw new Error("NOT_FOUND");
}

/** Open journal lots for portfolio math, plus a flattening close on the close date. */
export async function listWorkspaceInvestmentActivities(workspaceId: string) {
  const rows = await db
    .select({
      instrumentId: investmentTradeJournal.instrumentId,
      activityDate: investmentTradeJournal.activityDate,
      activityType: investmentTradeJournal.activityType,
      quantity: investmentTradeJournal.quantity,
      status: investmentTradeJournal.status,
      closedAt: investmentTradeJournal.closedAt,
    })
    .from(investmentTradeJournal)
    .where(eq(investmentTradeJournal.workspaceId, workspaceId));

  const events: Array<{
    instrumentId: string;
    activityDate: string;
    type: MoneyInvestmentActivityType;
    quantity: string | null;
  }> = [];

  for (const row of rows) {
    events.push({
      instrumentId: row.instrumentId,
      activityDate: row.activityDate,
      type: row.activityType,
      quantity: formatQuantityDisplay(row.quantity) || null,
    });
    if (row.status === "closed" && row.closedAt) {
      const closeDate = occurredAtToActivityDate(row.closedAt);
      events.push({
        instrumentId: row.instrumentId,
        activityDate: closeDate,
        type: row.activityType === "buy" ? "sell" : "buy",
        quantity: formatQuantityDisplay(row.quantity) || null,
      });
    }
  }

  return events;
}

export async function createInvestmentActivityWithCtx(
  ctx: MoneyWorkspaceCtx,
  input: z.infer<typeof investmentActivityCreateSchema>,
) {
  return createInvestmentActivity(ctx.workspaceId, ctx.userSub, input);
}
