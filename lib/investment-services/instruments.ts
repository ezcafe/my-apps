import { and, asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { investmentInstrument } from "@/db/schema/investment";
import { moneyAccount, moneyCategory } from "@/db/schema/money";
import type {
  investmentInstrumentCreateSchema,
  investmentInstrumentUpdateSchema,
} from "@/lib/validators/investment";
import type { z } from "zod";
import { defaultYahooSymbol } from "@/lib/investment-yahoo";
import { defaultContractSize } from "@/lib/investment-contract-size";

async function assertLedgerDefaults(
  workspaceId: string,
  input: {
    moneyAccountId?: string | null;
    incomeCategoryId?: string | null;
    expenseCategoryId?: string | null;
  },
) {
  if (input.moneyAccountId) {
    const [account] = await db
      .select({ id: moneyAccount.id })
      .from(moneyAccount)
      .where(
        and(
          eq(moneyAccount.id, input.moneyAccountId),
          eq(moneyAccount.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    if (!account) throw new Error("Invalid account");
  }
  if (input.incomeCategoryId) {
    const [row] = await db
      .select({ id: moneyCategory.id, kind: moneyCategory.kind })
      .from(moneyCategory)
      .where(
        and(
          eq(moneyCategory.id, input.incomeCategoryId),
          eq(moneyCategory.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    if (!row || row.kind !== "income") {
      throw new Error("Profit category must be an income category");
    }
  }
  if (input.expenseCategoryId) {
    const [row] = await db
      .select({ id: moneyCategory.id, kind: moneyCategory.kind })
      .from(moneyCategory)
      .where(
        and(
          eq(moneyCategory.id, input.expenseCategoryId),
          eq(moneyCategory.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    if (!row || row.kind !== "expense") {
      throw new Error("Loss category must be an expense category");
    }
  }
}

export async function countInvestmentInstruments(
  workspaceId: string,
): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(investmentInstrument)
    .where(
      and(
        eq(investmentInstrument.workspaceId, workspaceId),
        eq(investmentInstrument.archived, 0),
      ),
    );
  return Number(row?.n ?? 0);
}

export async function listInvestmentInstruments(workspaceId: string) {
  return db
    .select()
    .from(investmentInstrument)
    .where(eq(investmentInstrument.workspaceId, workspaceId))
    .orderBy(asc(investmentInstrument.name));
}

export async function createInvestmentInstrument(
  workspaceId: string,
  input: z.infer<typeof investmentInstrumentCreateSchema>,
) {
  const yahooSymbol =
    input.yahooSymbol?.trim() ||
    defaultYahooSymbol(input.kind, input.symbol, input.currency);
  const contractSize =
    input.contractSize?.trim() ||
    defaultContractSize(input.kind, input.symbol);
  await assertLedgerDefaults(workspaceId, input);
  const [row] = await db
    .insert(investmentInstrument)
    .values({
      workspaceId,
      kind: input.kind,
      name: input.symbol.trim(),
      currency: input.currency ?? "USD",
      symbol: input.symbol.trim(),
      yahooSymbol,
      contractSize,
      moneyAccountId: input.moneyAccountId,
      incomeCategoryId: input.incomeCategoryId,
      expenseCategoryId: input.expenseCategoryId,
    })
    .returning();
  return row!;
}

export async function updateInvestmentInstrument(
  workspaceId: string,
  id: string,
  input: z.infer<typeof investmentInstrumentUpdateSchema>,
) {
  await assertLedgerDefaults(workspaceId, input);
  const [row] = await db
    .update(investmentInstrument)
    .set({
      ...(input.kind !== undefined ? { kind: input.kind } : {}),
      ...(input.symbol !== undefined
        ? { symbol: input.symbol.trim(), name: input.symbol.trim() }
        : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.yahooSymbol !== undefined
        ? { yahooSymbol: input.yahooSymbol }
        : {}),
      ...(input.contractSize != null && input.contractSize.trim() !== ""
        ? { contractSize: input.contractSize.trim() }
        : {}),
      ...(input.archived !== undefined
        ? { archived: input.archived ? 1 : 0 }
        : {}),
      ...(input.moneyAccountId !== undefined
        ? { moneyAccountId: input.moneyAccountId }
        : {}),
      ...(input.incomeCategoryId !== undefined
        ? { incomeCategoryId: input.incomeCategoryId }
        : {}),
      ...(input.expenseCategoryId !== undefined
        ? { expenseCategoryId: input.expenseCategoryId }
        : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(investmentInstrument.id, id),
        eq(investmentInstrument.workspaceId, workspaceId),
      ),
    )
    .returning();
  if (!row) throw new Error("NOT_FOUND");
  return row;
}

export async function getInvestmentInstrument(workspaceId: string, id: string) {
  const [row] = await db
    .select()
    .from(investmentInstrument)
    .where(
      and(
        eq(investmentInstrument.id, id),
        eq(investmentInstrument.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listActiveMarketInstruments() {
  return db
    .select()
    .from(investmentInstrument)
    .where(eq(investmentInstrument.archived, 0));
}
