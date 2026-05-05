import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  moneyAccount,
  moneyRule,
  moneyTag,
  moneyTransaction,
  moneyTransactionTag,
} from "@/db/schema/money";
import {
  badRequest,
  notFound,
  requireMoneyContext,
} from "@/lib/api-money";
import {
  accountEffectsSnapshotForTransaction,
  applyBalanceAfterTransactionDelete,
  applyBalanceAfterTransactionUpdate,
  type TxRowForBalance,
} from "@/lib/money-account-balance";
import { applyRulesToTransaction } from "@/lib/rules";
import { transactionUpdateSchema } from "@/lib/validators/money";

type Params = { params: Promise<{ id: string }> };

async function loadTx(workspaceId: string, id: string) {
  const row = await db
    .select()
    .from(moneyTransaction)
    .where(
      and(
        eq(moneyTransaction.id, id),
        eq(moneyTransaction.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  return row[0] ?? null;
}

async function loadTagIds(transactionId: string) {
  const links = await db
    .select({ tagId: moneyTransactionTag.tagId })
    .from(moneyTransactionTag)
    .where(eq(moneyTransactionTag.transactionId, transactionId));
  return links.map((l) => l.tagId);
}

export async function GET(_req: Request, { params }: Params) {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const row = await loadTx(ctx.workspaceId, id);
  if (!row) return notFound();

  const tagIds = await loadTagIds(id);
  return NextResponse.json({
    data: {
      ...row,
      occurredAt: row.occurredAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      tagIds,
    },
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await loadTx(ctx.workspaceId, id);
  if (!existing) return notFound();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const parsed = transactionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const patch = parsed.data;
  const nextAccountId = patch.accountId ?? existing.accountId;

  const accountRow = await db
    .select({ id: moneyAccount.id })
    .from(moneyAccount)
    .where(
      and(
        eq(moneyAccount.id, nextAccountId),
        eq(moneyAccount.workspaceId, ctx.workspaceId),
      ),
    )
    .limit(1);

  if (!accountRow.length) return badRequest("Invalid account");

  const rules = await db
    .select({
      priority: moneyRule.priority,
      match: moneyRule.match,
      action: moneyRule.action,
    })
    .from(moneyRule)
    .where(
      and(
        eq(moneyRule.workspaceId, ctx.workspaceId),
        eq(moneyRule.active, true),
      ),
    );

  const ruleModels = rules.map((r) => ({
    priority: r.priority,
    match: r.match as Parameters<typeof applyRulesToTransaction>[1][number]["match"],
    action: r.action as Parameters<typeof applyRulesToTransaction>[1][number]["action"],
  }));

  const mergedForRules = applyRulesToTransaction(
    {
      accountId: nextAccountId,
      merchantId: patch.merchantId ?? existing.merchantId,
      categoryId: patch.categoryId ?? existing.categoryId,
      tagIds: patch.tagIds ?? (await loadTagIds(id)),
    },
    ruleModels,
  );

  const uniqueTags = [...new Set(mergedForRules.tagIds ?? [])];
  if (uniqueTags.length) {
    const tagsOk = await db
      .select({ id: moneyTag.id })
      .from(moneyTag)
      .where(
        and(
          eq(moneyTag.workspaceId, ctx.workspaceId),
          inArray(moneyTag.id, uniqueTags),
        ),
      );
    if (tagsOk.length !== uniqueTags.length) {
      return badRequest("Invalid tag reference");
    }
  }

  const before: TxRowForBalance = {
    id: existing.id,
    accountId: existing.accountId,
    kind: existing.kind,
    amountMinor: existing.amountMinor,
    occurredAt: existing.occurredAt,
    createdAt: existing.createdAt,
    transferPairId: existing.transferPairId,
  };

  const updated = await db.transaction(async (tx) => {
    const oldTotals = await accountEffectsSnapshotForTransaction(
      tx,
      ctx.workspaceId,
      before,
    );

    const [row] = await tx
      .update(moneyTransaction)
      .set({
        accountId: nextAccountId,
        kind: patch.kind ?? existing.kind,
        amountMinor: patch.amountMinor ?? existing.amountMinor,
        occurredAt: patch.occurredAt
          ? new Date(patch.occurredAt)
          : existing.occurredAt,
        categoryId: mergedForRules.categoryId ?? null,
        merchantId:
          mergedForRules.merchantId ?? patch.merchantId ?? existing.merchantId,
        notes: patch.notes ?? existing.notes,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(moneyTransaction.id, id),
          eq(moneyTransaction.workspaceId, ctx.workspaceId),
        ),
      )
      .returning();

    if (!row) {
      throw new Error("Transaction update returned no row");
    }

    const after: TxRowForBalance = {
      id: row.id,
      accountId: row.accountId,
      kind: row.kind,
      amountMinor: row.amountMinor,
      occurredAt: row.occurredAt,
      createdAt: row.createdAt,
      transferPairId: row.transferPairId,
    };
    await applyBalanceAfterTransactionUpdate(
      tx,
      ctx.workspaceId,
      oldTotals,
      after,
    );

    await tx
      .delete(moneyTransactionTag)
      .where(eq(moneyTransactionTag.transactionId, id));

    if (uniqueTags.length) {
      await tx.insert(moneyTransactionTag).values(
        uniqueTags.map((tagId) => ({
          transactionId: id,
          tagId,
        })),
      );
    }

    return row;
  });

  return NextResponse.json({
    data: {
      ...updated,
      occurredAt: updated.occurredAt.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      tagIds: uniqueTags,
    },
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await loadTx(ctx.workspaceId, id);
  if (!existing) return notFound();

  const deleted: TxRowForBalance = {
    id: existing.id,
    accountId: existing.accountId,
    kind: existing.kind,
    amountMinor: existing.amountMinor,
    occurredAt: existing.occurredAt,
    createdAt: existing.createdAt,
    transferPairId: existing.transferPairId,
  };

  await db.transaction(async (tx) => {
    await applyBalanceAfterTransactionDelete(tx, ctx.workspaceId, deleted);
  });

  return NextResponse.json({ data: { ok: true } });
}
