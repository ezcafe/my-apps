import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  moneyAccount,
  moneyRecurrentTemplate,
  moneyTag,
  moneyTransaction,
  moneyTransactionTag,
} from "@/db/schema/money";
import { badRequest, notFound, requireMoneyContext } from "@/lib/api-money";
import {
  applyTransactionBalanceEffect,
  type TxRowForBalance,
} from "@/lib/money-account-balance";
import { addCadence } from "@/lib/recurrence";
import type { MoneyCadence } from "@/lib/recurrence";
import { recurrentTemplateBodySchema } from "@/lib/validators/money";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;

  const row = await db
    .select()
    .from(moneyRecurrentTemplate)
    .where(
      and(
        eq(moneyRecurrentTemplate.id, id),
        eq(moneyRecurrentTemplate.workspaceId, ctx.workspaceId),
      ),
    )
    .limit(1);

  const tplRow = row[0];
  if (!tplRow) return notFound();
  if (!tplRow.active) return badRequest("Template inactive");

  const parsedTpl = recurrentTemplateBodySchema.safeParse(tplRow.template);
  if (!parsedTpl.success) {
    return badRequest("Invalid stored template");
  }

  const t = parsedTpl.data;

  const accountOk = await db
    .select({ id: moneyAccount.id })
    .from(moneyAccount)
    .where(
      and(
        eq(moneyAccount.id, t.accountId),
        eq(moneyAccount.workspaceId, ctx.workspaceId),
      ),
    )
    .limit(1);

  if (!accountOk.length) return badRequest("Invalid template account");

  const tagIds = [...new Set(t.tagIds ?? [])];
  if (tagIds.length) {
    const tagsOk = await db
      .select({ id: moneyTag.id })
      .from(moneyTag)
      .where(
        and(
          eq(moneyTag.workspaceId, ctx.workspaceId),
          inArray(moneyTag.id, tagIds),
        ),
      );
    if (tagsOk.length !== tagIds.length) {
      return badRequest("Invalid template tags");
    }
  }

  const occurredAt = tplRow.nextRunAt;

  const next = addCadence(tplRow.nextRunAt, tplRow.cadence as MoneyCadence);

  const created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(moneyTransaction)
      .values({
        workspaceId: ctx.workspaceId,
        accountId: t.accountId,
        kind: t.kind,
        amountMinor: t.amountMinor,
        occurredAt,
        categoryId: t.categoryId ?? null,
        merchantId: t.merchantId ?? null,
        notes: t.notes ?? null,
        createdBySub: ctx.userSub,
        recurrenceSourceId: tplRow.id,
      })
      .returning();

    if (!row) {
      throw new Error("Recurrence insert returned no row");
    }

    const balanceRow: TxRowForBalance = {
      id: row.id,
      accountId: row.accountId,
      kind: row.kind,
      amountMinor: row.amountMinor,
      occurredAt: row.occurredAt,
      createdAt: row.createdAt,
      transferPairId: row.transferPairId,
    };
    await applyTransactionBalanceEffect(tx, ctx.workspaceId, balanceRow, 1);

    if (tagIds.length) {
      await tx.insert(moneyTransactionTag).values(
        tagIds.map((tagId) => ({
          transactionId: row.id,
          tagId,
        })),
      );
    }

    await tx
      .update(moneyRecurrentTemplate)
      .set({ nextRunAt: next })
      .where(eq(moneyRecurrentTemplate.id, id));

    return row;
  });

  return NextResponse.json({
    data: {
      transaction: {
        ...created,
        occurredAt: created.occurredAt.toISOString(),
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
        tagIds,
      },
      nextRunAt: next.toISOString(),
    },
  });
}
