import { and, asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { investmentInstrument } from "@/db/schema/investment";
import type {
  investmentInstrumentCreateSchema,
  investmentInstrumentUpdateSchema,
} from "@/lib/validators/investment";
import type { z } from "zod";
import { defaultYahooSymbol } from "@/lib/investment-yahoo";

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
  const [row] = await db
    .insert(investmentInstrument)
    .values({
      workspaceId,
      kind: input.kind,
      name: input.name,
      currency: input.currency ?? "USD",
      symbol: input.symbol,
      yahooSymbol,
    })
    .returning();
  return row!;
}

export async function updateInvestmentInstrument(
  workspaceId: string,
  id: string,
  input: z.infer<typeof investmentInstrumentUpdateSchema>,
) {
  const [row] = await db
    .update(investmentInstrument)
    .set({
      ...(input.kind !== undefined ? { kind: input.kind } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.symbol !== undefined ? { symbol: input.symbol } : {}),
      ...(input.yahooSymbol !== undefined
        ? { yahooSymbol: input.yahooSymbol }
        : {}),
      ...(input.archived !== undefined
        ? { archived: input.archived ? 1 : 0 }
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
