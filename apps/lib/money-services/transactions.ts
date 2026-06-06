import { randomUUID } from "crypto";
import { and, asc, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  moneyAccount,
  moneyCategory,
  moneyRecurrentTemplate,
  moneyRule,
  moneyTag,
  moneyTransaction,
  moneyTransactionTag,
} from "@/db/schema/money";
import {
  applyBalanceAfterTransactionDelete,
  applyBalanceAfterTransactionUpdate,
  accountEffectsSnapshotForTransaction,
  applyTransactionBalanceEffect,
  type TxRowForBalance,
} from "@/lib/money-account-balance";
import { assertCategoryKindMatches } from "@/lib/money-category-kind-check";
import {
  moneyTransactionConditionsForAnalytics,
  resolveAnalyticsFiltersForQuery,
} from "@/lib/money-transaction-analytics-conditions";
import { applyRulesToTransaction } from "@/lib/rules";
import { addCadence } from "@/lib/recurrence";
import type { RecurrenceFormCadence } from "@/lib/recurrence";
import {
  transactionCreateSchema,
  transactionListQuerySchema,
  transactionUpdateSchema,
} from "@/lib/validators/money";
import type { MoneyWorkspaceCtx } from "@/lib/money-services/types";

const TOP_AMOUNTS_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

const sortColumnMap = {
  occurredAt: moneyTransaction.occurredAt,
  amountMinor: moneyTransaction.amountMinor,
  kind: moneyTransaction.kind,
  createdAt: moneyTransaction.createdAt,
} as const;

export async function listMoneyTopAmounts(workspaceId: string, limit = 3) {
  const since = new Date(Date.now() - TOP_AMOUNTS_WINDOW_MS);
  return db
    .select({
      amountMinor: moneyTransaction.amountMinor,
      usageCount: sql<number>`count(*)::int`.as("usage_count"),
    })
    .from(moneyTransaction)
    .where(
      and(
        eq(moneyTransaction.workspaceId, workspaceId),
        gte(moneyTransaction.occurredAt, since),
      ),
    )
    .groupBy(moneyTransaction.amountMinor)
    .orderBy(desc(sql`usage_count`), asc(moneyTransaction.amountMinor))
    .limit(limit);
}

export type SerializedMoneyTransaction = {
  id: string;
  workspaceId: string;
  accountId: string;
  kind: string;
  amountMinor: number;
  occurredAt: string;
  categoryId: string | null;
  merchantId: string | null;
  notes: string | null;
  createdBySub: string | null;
  transferPairId: string | null;
  createdAt: string;
  updatedAt: string;
  tagIds: string[];
};

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

function serializeRow(
  row: typeof moneyTransaction.$inferSelect,
  tagIds: string[],
): SerializedMoneyTransaction {
  return {
    ...row,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    tagIds,
  };
}

export async function getMoneyTransaction(
  workspaceId: string,
  id: string,
): Promise<SerializedMoneyTransaction | null> {
  const row = await loadTx(workspaceId, id);
  if (!row) return null;
  const tagIds = await loadTagIds(id);
  return serializeRow(row, tagIds);
}

export async function listMoneyTransactions(
  workspaceId: string,
  rawQuery: unknown,
  legacy?: { accountId?: string | null; categoryId?: string | null },
): Promise<{
  data: SerializedMoneyTransaction[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const parsed = transactionListQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join("; ") || "Invalid query",
    );
  }

  const q = parsed.data;
  const filterSlice: Parameters<typeof moneyTransactionConditionsForAnalytics>[1] =
    {
      from: q.from,
      to: q.to,
      accountIds: q.accountIds,
      categoryIds: q.categoryIds,
      merchantIds: q.merchantIds,
      tagIds: q.tagIds,
      kinds: q.kinds,
      recurrence: q.recurrence,
      recurrenceSourceIds: q.recurrenceSourceIds,
    };

  const resolvedFilters = await resolveAnalyticsFiltersForQuery(
    workspaceId,
    filterSlice,
  );
  const conditions = moneyTransactionConditionsForAnalytics(
    workspaceId,
    resolvedFilters,
  );

  const legacyAccountId = legacy?.accountId ?? undefined;
  const legacyCategoryId = legacy?.categoryId ?? undefined;
  if (legacyAccountId && z.string().uuid().safeParse(legacyAccountId).success) {
    conditions.push(eq(moneyTransaction.accountId, legacyAccountId));
  }
  if (
    legacyCategoryId &&
    z.string().uuid().safeParse(legacyCategoryId).success
  ) {
    conditions.push(eq(moneyTransaction.categoryId, legacyCategoryId));
  }

  const whereClause = and(...conditions);
  const orderCol = sortColumnMap[q.sort];
  const orderExpr = q.dir === "asc" ? asc(orderCol) : desc(orderCol);

  const offset = (q.page - 1) * q.pageSize;

  const [[{ value: total }], rows] = await Promise.all([
    db
      .select({ value: count() })
      .from(moneyTransaction)
      .where(whereClause),
    db
      .select()
      .from(moneyTransaction)
      .where(whereClause)
      .orderBy(orderExpr)
      .limit(q.pageSize)
      .offset(offset),
  ]);

  const ids = rows.map((r) => r.id);
  const tagLinks =
    ids.length === 0
      ? []
      : await db
          .select({
            transactionId: moneyTransactionTag.transactionId,
            tagId: moneyTransactionTag.tagId,
          })
          .from(moneyTransactionTag)
          .where(inArray(moneyTransactionTag.transactionId, ids));

  const tagIdsByTx = new Map<string, string[]>();
  for (const link of tagLinks) {
    const cur = tagIdsByTx.get(link.transactionId) ?? [];
    cur.push(link.tagId);
    tagIdsByTx.set(link.transactionId, cur);
  }

  const data = rows.map((r) =>
    serializeRow(r, tagIdsByTx.get(r.id) ?? []),
  );

  return {
    data,
    total,
    page: q.page,
    pageSize: q.pageSize,
  };
}

export async function createMoneyTransaction(
  ctx: MoneyWorkspaceCtx,
  body: unknown,
): Promise<SerializedMoneyTransaction> {
  const parsed = transactionCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const accountRow = await db
    .select({ id: moneyAccount.id, name: moneyAccount.name })
    .from(moneyAccount)
    .where(
      and(
        eq(moneyAccount.id, parsed.data.accountId),
        eq(moneyAccount.workspaceId, ctx.workspaceId),
      ),
    )
    .limit(1);

  if (!accountRow.length) throw new Error("Invalid account");
  let toAccountId: string | null = null;
  let toAccountRow: { id: string; name: string }[] = [];
  if (parsed.data.kind === "transfer") {
    toAccountId = parsed.data.toAccountId ?? null;
    if (!toAccountId) throw new Error("Destination account is required");
    if (toAccountId === parsed.data.accountId) {
      throw new Error("From and destination accounts must be different");
    }
    toAccountRow = await db
      .select({ id: moneyAccount.id, name: moneyAccount.name })
      .from(moneyAccount)
      .where(
        and(
          eq(moneyAccount.id, toAccountId),
          eq(moneyAccount.workspaceId, ctx.workspaceId),
        ),
      )
      .limit(1);
    if (!toAccountRow.length) throw new Error("Invalid destination account");
  }

  const kind = parsed.data.kind;
  const occurredAt = parsed.data.occurredAt
    ? new Date(parsed.data.occurredAt)
    : new Date();

  const rules = await db
    .select({
      kind: moneyRule.kind,
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
    kind: r.kind,
    priority: r.priority,
    match: r.match as Parameters<typeof applyRulesToTransaction>[1][number]["match"],
    action: r.action as Parameters<typeof applyRulesToTransaction>[1][number]["action"],
  }));

  const afterRules = applyRulesToTransaction(
    {
      kind,
      accountId: parsed.data.accountId,
      merchantId: parsed.data.merchantId ?? null,
      categoryId: parsed.data.categoryId ?? null,
      tagIds: parsed.data.tagIds ?? [],
    },
    ruleModels,
  );

  if (kind !== "transfer" && afterRules.categoryId) {
    await assertCategoryKindMatches(
      ctx.workspaceId,
      afterRules.categoryId,
      kind,
    );
  }

  const baseTagIds = [...new Set(afterRules.tagIds ?? [])];
  if (baseTagIds.length) {
    const tagsOk = await db
      .select({ id: moneyTag.id })
      .from(moneyTag)
      .where(
        and(
          eq(moneyTag.workspaceId, ctx.workspaceId),
          inArray(moneyTag.id, baseTagIds),
        ),
      );
    if (tagsOk.length !== baseTagIds.length) {
      throw new Error("Invalid tag reference");
    }
  }

  const normalizedTagNames = [
    ...new Set(
      (parsed.data.tagNames ?? [])
        .map((n) => n.trim())
        .filter((n) => n.length > 0),
    ),
  ];
  if (normalizedTagNames.length > 50) {
    throw new Error("Too many tags");
  }

  try {
    const created = await db.transaction(async (tx) => {
      const fromNames: string[] = [];
      for (const name of normalizedTagNames) {
        const [existing] = await tx
          .select({ id: moneyTag.id })
          .from(moneyTag)
          .where(
            and(
              eq(moneyTag.workspaceId, ctx.workspaceId),
              eq(moneyTag.name, name),
            ),
          )
          .limit(1);
        if (existing) {
          fromNames.push(existing.id);
        } else {
          const [inserted] = await tx
            .insert(moneyTag)
            .values({ workspaceId: ctx.workspaceId, name })
            .returning({ id: moneyTag.id });
          fromNames.push(inserted.id);
        }
      }

      const uniqueTags = [...new Set([...baseTagIds, ...fromNames])];

      let recurrenceSourceId: string | null = null;
      if (parsed.data.recurrence && kind !== "transfer") {
        const recurrenceName =
          parsed.data.recurrence.name?.trim() ||
          parsed.data.notes?.trim()?.slice(0, 200) ||
          "Recurrence";
        const nextRunAt = addCadence(
          occurredAt,
          parsed.data.recurrence.cadence as RecurrenceFormCadence,
        );
        const [tpl] = await tx
          .insert(moneyRecurrentTemplate)
          .values({
            workspaceId: ctx.workspaceId,
            name: recurrenceName,
            cadence: parsed.data.recurrence.cadence,
            nextRunAt,
            template: {
              accountId: parsed.data.accountId,
              kind,
              amountMinor: parsed.data.amountMinor,
              categoryId: afterRules.categoryId ?? null,
              merchantId: afterRules.merchantId ?? parsed.data.merchantId ?? null,
              notes: parsed.data.notes ?? null,
              tagIds: uniqueTags,
            },
            active: true,
          })
          .returning({ id: moneyRecurrentTemplate.id });
        recurrenceSourceId = tpl.id;
      }

      if (kind !== "transfer") {
        const [row] = await tx
          .insert(moneyTransaction)
          .values({
            workspaceId: ctx.workspaceId,
            accountId: parsed.data.accountId,
            kind,
            amountMinor: parsed.data.amountMinor,
            occurredAt,
            categoryId: afterRules.categoryId ?? null,
            merchantId: afterRules.merchantId ?? parsed.data.merchantId ?? null,
            notes: parsed.data.notes ?? null,
            createdBySub: ctx.userSub,
            recurrenceSourceId,
          })
          .returning();

        if (uniqueTags.length) {
          await tx.insert(moneyTransactionTag).values(
            uniqueTags.map((tagId) => ({
              transactionId: row.id,
              tagId,
            })),
          );
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
        return { row, uniqueTags };
      }

      const transferPairId = randomUUID();
      const fromAccountName = accountRow[0].name;
      const toAccountName = toAccountRow[0].name;
      const customNotes = parsed.data.notes?.trim();
      const fromTransferNote = `Transfer to ${toAccountName}${
        customNotes ? ` | ${customNotes}` : ""
      }`;
      const toTransferNote = `Transfer from ${fromAccountName}${
        customNotes ? ` | ${customNotes}` : ""
      }`;
      const transferValues = {
        workspaceId: ctx.workspaceId,
        kind,
        amountMinor: parsed.data.amountMinor,
        occurredAt,
        categoryId: null,
        merchantId: null,
        createdBySub: ctx.userSub,
        transferPairId,
      } as const;
      const [fromRow] = await tx
        .insert(moneyTransaction)
        .values({
          ...transferValues,
          accountId: parsed.data.accountId,
          notes: fromTransferNote,
        })
        .returning();
      const [toRow] = await tx
        .insert(moneyTransaction)
        .values({
          ...transferValues,
          accountId: toAccountId!,
          notes: toTransferNote,
        })
        .returning();

      if (uniqueTags.length) {
        await tx.insert(moneyTransactionTag).values(
          [fromRow.id, toRow.id].flatMap((transactionId) =>
            uniqueTags.map((tagId) => ({
              transactionId,
              tagId,
            })),
          ),
        );
      }

      const fromBalanceRow: TxRowForBalance = {
        id: fromRow.id,
        accountId: fromRow.accountId,
        kind: fromRow.kind,
        amountMinor: fromRow.amountMinor,
        occurredAt: fromRow.occurredAt,
        createdAt: fromRow.createdAt,
        transferPairId: fromRow.transferPairId,
      };
      const toBalanceRow: TxRowForBalance = {
        id: toRow.id,
        accountId: toRow.accountId,
        kind: toRow.kind,
        amountMinor: toRow.amountMinor,
        occurredAt: toRow.occurredAt,
        createdAt: toRow.createdAt,
        transferPairId: toRow.transferPairId,
      };
      await applyTransactionBalanceEffect(tx, ctx.workspaceId, fromBalanceRow, 1);
      await applyTransactionBalanceEffect(tx, ctx.workspaceId, toBalanceRow, 1);

      return { row: fromRow, uniqueTags };
    });

    return serializeRow(created.row, created.uniqueTags);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("money_tag_workspace_name_uq") || msg.includes("unique")) {
      throw new Error("Duplicate tag name");
    }
    throw e;
  }
}

export async function updateMoneyTransaction(
  ctx: MoneyWorkspaceCtx,
  id: string,
  body: unknown,
): Promise<SerializedMoneyTransaction> {
  const existing = await loadTx(ctx.workspaceId, id);
  if (!existing) throw new Error("NOT_FOUND");

  const parsed = transactionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
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

  if (!accountRow.length) throw new Error("Invalid account");

  const rules = await db
    .select({
      kind: moneyRule.kind,
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
    kind: r.kind,
    priority: r.priority,
    match: r.match as Parameters<typeof applyRulesToTransaction>[1][number]["match"],
    action: r.action as Parameters<typeof applyRulesToTransaction>[1][number]["action"],
  }));

  const nextKind = patch.kind ?? existing.kind;

  const mergedForRules = applyRulesToTransaction(
    {
      kind: nextKind,
      accountId: nextAccountId,
      merchantId: patch.merchantId ?? existing.merchantId,
      categoryId: patch.categoryId ?? existing.categoryId,
      tagIds: patch.tagIds ?? (await loadTagIds(id)),
    },
    ruleModels,
  );

  if (nextKind !== "transfer" && mergedForRules.categoryId) {
    await assertCategoryKindMatches(
      ctx.workspaceId,
      mergedForRules.categoryId,
      nextKind,
    );
  } else if (nextKind === "transfer") {
    mergedForRules.categoryId = null;
  }

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
      throw new Error("Invalid tag reference");
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
        kind: nextKind,
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

  return serializeRow(updated, uniqueTags);
}

export async function deleteMoneyTransaction(
  ctx: MoneyWorkspaceCtx,
  id: string,
): Promise<boolean> {
  const existing = await loadTx(ctx.workspaceId, id);
  if (!existing) return false;

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

  return true;
}
