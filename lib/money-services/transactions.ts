import { randomUUID } from "crypto";
import { and, asc, count, desc, eq, gte, inArray, lt, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  moneyAccount,
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
  categoryKindForTransactionKind,
} from "@/lib/validators/money";
import {
  deleteJournalLotsForLedgerTransaction,
  syncJournalLotsForLedgerTransaction,
} from "@/lib/investment-services/journal-ledger-sync";
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
  excludeFromAnalyticsAndBudget: boolean;
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
  nextCursor: string | null;
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
      accountTypes: q.accountTypes,
      excludeAccountTypes: q.excludeAccountTypes,
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
  const idOrder = q.dir === "asc" ? asc(moneyTransaction.id) : desc(moneyTransaction.id);

  const useKeyset = Boolean(q.cursor) && q.sort === "occurredAt";
  if (useKeyset && q.cursor) {
    try {
      const decoded = Buffer.from(q.cursor, "base64url").toString("utf8");
      const sep = decoded.lastIndexOf("|");
      if (sep <= 0) throw new Error("bad cursor");
      const occurredAt = new Date(decoded.slice(0, sep));
      const id = decoded.slice(sep + 1);
      if (!Number.isFinite(occurredAt.getTime()) || !id) throw new Error("bad cursor");
      if (q.dir === "desc") {
        conditions.push(
          or(
            lt(moneyTransaction.occurredAt, occurredAt),
            and(
              eq(moneyTransaction.occurredAt, occurredAt),
              lt(moneyTransaction.id, id),
            ),
          )!,
        );
      } else {
        conditions.push(
          or(
            sql`${moneyTransaction.occurredAt} > ${occurredAt}`,
            and(
              eq(moneyTransaction.occurredAt, occurredAt),
              sql`${moneyTransaction.id} > ${id}`,
            ),
          )!,
        );
      }
    } catch {
      throw new Error("Invalid cursor");
    }
  }

  const listWhere = and(...conditions);
  const offset = useKeyset ? 0 : (q.page - 1) * q.pageSize;

  const [[{ value: total }], rows] = await Promise.all([
    db
      .select({ value: count() })
      .from(moneyTransaction)
      .where(whereClause),
    db
      .select()
      .from(moneyTransaction)
      .where(listWhere)
      .orderBy(orderExpr, idOrder)
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
    nextCursor:
      q.sort === "occurredAt" && data.length === q.pageSize
        ? Buffer.from(
            `${data[data.length - 1]!.occurredAt}|${data[data.length - 1]!.id}`,
            "utf8",
          ).toString("base64url")
        : null,
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
  const excludeFromAnalyticsAndBudget =
    parsed.data.excludeFromAnalyticsAndBudget ?? false;

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
    const expected = categoryKindForTransactionKind(kind);
    if (expected) {
      await assertCategoryKindMatches(
        ctx.workspaceId,
        afterRules.categoryId,
        expected,
      );
    }
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
      if (normalizedTagNames.length > 0) {
        const existingTags = await tx
          .select({ id: moneyTag.id, name: moneyTag.name })
          .from(moneyTag)
          .where(
            and(
              eq(moneyTag.workspaceId, ctx.workspaceId),
              inArray(moneyTag.name, normalizedTagNames),
            ),
          );
        const tagIdByName = new Map(existingTags.map((t) => [t.name, t.id]));
        const missingNames = normalizedTagNames.filter(
          (name) => !tagIdByName.has(name),
        );
        if (missingNames.length > 0) {
          const insertedTags = await tx
            .insert(moneyTag)
            .values(
              missingNames.map((name) => ({
                workspaceId: ctx.workspaceId,
                name,
              })),
            )
            .returning({ id: moneyTag.id, name: moneyTag.name });
          for (const t of insertedTags) {
            tagIdByName.set(t.name, t.id);
          }
        }
        for (const name of normalizedTagNames) {
          const id = tagIdByName.get(name);
          if (id) fromNames.push(id);
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
              excludeFromAnalyticsAndBudget,
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
            excludeFromAnalyticsAndBudget,
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
        excludeFromAnalyticsAndBudget,
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
    const expected = categoryKindForTransactionKind(nextKind);
    if (expected) {
      await assertCategoryKindMatches(
        ctx.workspaceId,
        mergedForRules.categoryId,
        expected,
      );
    }
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
        ...(patch.excludeFromAnalyticsAndBudget !== undefined
          ? {
              excludeFromAnalyticsAndBudget:
                patch.excludeFromAnalyticsAndBudget,
            }
          : {}),
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

    if (
      existing.transferPairId &&
      patch.excludeFromAnalyticsAndBudget !== undefined
    ) {
      await tx
        .update(moneyTransaction)
        .set({
          excludeFromAnalyticsAndBudget: patch.excludeFromAnalyticsAndBudget,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(moneyTransaction.workspaceId, ctx.workspaceId),
            eq(moneyTransaction.transferPairId, existing.transferPairId),
            ne(moneyTransaction.id, id),
          ),
        );
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

      await syncJournalLotsForLedgerTransaction(tx, ctx.workspaceId, {
        transactionId: id,
        kind: nextKind,
        amountMinor: patch.amountMinor ?? existing.amountMinor,
        occurredAt: patch.occurredAt
          ? new Date(patch.occurredAt)
          : existing.occurredAt,
        notes: patch.notes ?? existing.notes,
        accountId: nextAccountId,
      });

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
    await deleteJournalLotsForLedgerTransaction(tx, ctx.workspaceId, id);
    await applyBalanceAfterTransactionDelete(tx, ctx.workspaceId, deleted);
  });

  return true;
}
