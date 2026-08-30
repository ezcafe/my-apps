import { randomUUID } from "node:crypto";
import { categoryKindForTransactionKind } from "@/lib/validators/money";
import { and, eq, inArray } from "drizzle-orm";
import type { AppDatabase } from "@/db";
import { db } from "@/db";
import {
  moneyAccount,
  moneyBudget,
  moneyCategory,
  moneyMerchant,
  moneyRecurrentTemplate,
  moneyRule,
  moneyTag,
  moneyTransaction,
  moneyTransactionTag,
} from "@/db/schema/money";
import {
  applyBalanceDeltas,
  effectOnAccount,
  sortTransferPairRows,
  type TxRowForBalance,
} from "@/lib/money-account-balance";
import type {
  CategoryImportRow,
  MoneyImportType,
  TransactionImportRow,
} from "@/lib/money-import-types";
import type { z } from "zod";
import type {
  accountCreateSchema,
  budgetCreateSchema,
  recurrentCreateSchema,
  ruleCreateSchema,
} from "@/lib/validators/money";
import { getWorkspaceDefaultCurrency } from "@/lib/workspace";

type MoneyCtx = { userSub: string; workspaceId: string };

type MoneyTx = Parameters<Parameters<AppDatabase["transaction"]>[0]>[0];

type AccountRow = z.infer<typeof accountCreateSchema>;
type BudgetRow = z.infer<typeof budgetCreateSchema>;
type RuleRow = z.infer<typeof ruleCreateSchema>;
type RecurrenceRow = z.infer<typeof recurrentCreateSchema>;

/** Same rules as assertValidCategoryParent but uses import transaction. */
async function assertValidCategoryParentTx(
  tx: MoneyTx,
  workspaceId: string,
  parentId: string,
  kind: "expense" | "income",
  selfId?: string,
): Promise<string | null> {
  if (selfId && parentId === selfId) {
    return "Category cannot be its own parent";
  }
  const rows = await tx
    .select({
      id: moneyCategory.id,
      parentId: moneyCategory.parentId,
      kind: moneyCategory.kind,
    })
    .from(moneyCategory)
    .where(
      and(
        eq(moneyCategory.id, parentId),
        eq(moneyCategory.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  if (!rows.length) return "Invalid parent category";
  if (rows[0].parentId != null) {
    return "Parent must be a top-level category";
  }
  if (rows[0].kind !== kind) {
    return "Parent must be the same kind";
  }
  return null;
}

async function assertCategoriesKindMatchTx(
  tx: MoneyTx,
  workspaceId: string,
  ids: string[],
  expectedKind: "expense" | "income",
): Promise<void> {
  if (!ids.length) return;
  const rows = await tx
    .select({ id: moneyCategory.id, kind: moneyCategory.kind })
    .from(moneyCategory)
    .where(
      and(
        eq(moneyCategory.workspaceId, workspaceId),
        inArray(moneyCategory.id, ids),
      ),
    );
  if (rows.length !== ids.length) {
    throw new Error("One or more categories are missing in this workspace");
  }
  for (const r of rows) {
    if (r.kind !== expectedKind) {
      throw new Error(
        `Category kind '${r.kind}' does not match expected '${expectedKind}'`,
      );
    }
  }
}

async function assertAccountsInWorkspaceTx(
  tx: MoneyTx,
  workspaceId: string,
  ids: string[],
): Promise<void> {
  if (!ids.length) return;
  const rows = await tx
    .select({ id: moneyAccount.id })
    .from(moneyAccount)
    .where(
      and(
        eq(moneyAccount.workspaceId, workspaceId),
        inArray(moneyAccount.id, ids),
      ),
    );
  if (rows.length !== ids.length) {
    throw new Error("One or more accounts are missing in this workspace");
  }
}

async function assertCategoriesInWorkspaceTx(
  tx: MoneyTx,
  workspaceId: string,
  ids: string[],
): Promise<void> {
  if (!ids.length) return;
  const rows = await tx
    .select({ id: moneyCategory.id })
    .from(moneyCategory)
    .where(
      and(
        eq(moneyCategory.workspaceId, workspaceId),
        inArray(moneyCategory.id, ids),
      ),
    );
  if (rows.length !== ids.length) {
    throw new Error("One or more categories are missing in this workspace");
  }
}

async function assertMerchantsInWorkspaceTx(
  tx: MoneyTx,
  workspaceId: string,
  ids: string[],
): Promise<void> {
  if (!ids.length) return;
  const rows = await tx
    .select({ id: moneyMerchant.id })
    .from(moneyMerchant)
    .where(
      and(
        eq(moneyMerchant.workspaceId, workspaceId),
        inArray(moneyMerchant.id, ids),
      ),
    );
  if (rows.length !== ids.length) {
    throw new Error("One or more merchants are missing in this workspace");
  }
}

async function assertTagsInWorkspaceTx(
  tx: MoneyTx,
  workspaceId: string,
  ids: string[],
): Promise<void> {
  if (!ids.length) return;
  const rows = await tx
    .select({ id: moneyTag.id })
    .from(moneyTag)
    .where(
      and(eq(moneyTag.workspaceId, workspaceId), inArray(moneyTag.id, ids)),
    );
  if (rows.length !== ids.length) {
    throw new Error("One or more tags are missing in this workspace");
  }
}

async function importAccounts(tx: MoneyTx, ctx: MoneyCtx, rows: AccountRow[]) {
  if (rows.length === 0) return;
  const workspaceCurrency =
    (await getWorkspaceDefaultCurrency(ctx.workspaceId)) ?? "USD";
  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await tx.insert(moneyAccount).values(
      chunk.map((r) => ({
        workspaceId: ctx.workspaceId,
        name: r.name,
        type: r.type ?? "checking",
        currency: workspaceCurrency,
        institution: r.institution ?? null,
        balanceMinor: r.balanceMinor ?? 0,
        sortOrder: r.sortOrder ?? 0,
        archived: r.archived ?? false,
      })),
    );
  }
}

async function importCategories(
  tx: MoneyTx,
  ctx: MoneyCtx,
  rows: CategoryImportRow[],
) {
  const sourceIdMap = new Map<string, string>();
  const pending = new Map<number, CategoryImportRow>();
  rows.forEach((r, i) => pending.set(i, r));

  let guard = 0;
  while (pending.size) {
    if (guard++ > 5000) {
      throw new Error(
        "Category import failed (cycle or unresolved parentSourceId)",
      );
    }

    const readyIdx: number[] = [];
    for (const [idx, c] of pending) {
      if (c.parentSourceId && !sourceIdMap.has(c.parentSourceId)) {
        continue;
      }
      readyIdx.push(idx);
    }

    if (!readyIdx.length) {
      throw new Error(
        "Category import failed (cycle or unresolved parentSourceId)",
      );
    }

    for (const idx of readyIdx) {
      const c = pending.get(idx);
      if (!c) continue;

      let parentDbId: string | null = null;
      if (c.parentSourceId) {
        const mapped = sourceIdMap.get(c.parentSourceId);
        if (!mapped) {
          throw new Error(
            `Internal import error: missing parent for sourceId ${c.parentSourceId}`,
          );
        }
        parentDbId = mapped;
        const perr = await assertValidCategoryParentTx(
          tx,
          ctx.workspaceId,
          parentDbId,
          c.kind,
        );
        if (perr) throw new Error(perr);
      } else if (c.parentId) {
        const perr = await assertValidCategoryParentTx(
          tx,
          ctx.workspaceId,
          c.parentId,
          c.kind,
        );
        if (perr) throw new Error(perr);
        parentDbId = c.parentId;
      }

      const [ins] = await tx
        .insert(moneyCategory)
        .values({
          workspaceId: ctx.workspaceId,
          name: c.name,
          kind: c.kind,
          parentId: parentDbId,
          archived: c.archived ?? false,
        })
        .returning({ id: moneyCategory.id });

      if (c.sourceId) sourceIdMap.set(c.sourceId, ins.id);
      pending.delete(idx);
    }
  }
}

async function importBudgets(tx: MoneyTx, ctx: MoneyCtx, rows: BudgetRow[]) {
  if (rows.length === 0) return;
  const workspaceCurrency =
    (await getWorkspaceDefaultCurrency(ctx.workspaceId)) ?? "USD";

  const categoryIds = [
    ...new Set(
      rows
        .filter((r) => r.scopeType === "category" && r.scopeId)
        .map((r) => r.scopeId!),
    ),
  ];
  if (categoryIds.length) {
    await assertCategoriesInWorkspaceTx(tx, ctx.workspaceId, categoryIds);
  }

  const accountIds = [
    ...new Set(
      rows
        .filter((r) => r.scopeType === "account" && r.scopeId)
        .map((r) => r.scopeId!),
    ),
  ];
  if (accountIds.length) {
    await assertAccountsInWorkspaceTx(tx, ctx.workspaceId, accountIds);
  }

  const tagIds = [
    ...new Set(
      rows
        .filter((r) => r.scopeType === "tag" && r.scopeId)
        .map((r) => r.scopeId!),
    ),
  ];
  if (tagIds.length) {
    await assertTagsInWorkspaceTx(tx, ctx.workspaceId, tagIds);
  }

  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await tx.insert(moneyBudget).values(
      chunk.map((r) => ({
        workspaceId: ctx.workspaceId,
        scopeType: r.scopeType,
        scopeId: r.scopeType === "workspace" ? null : (r.scopeId ?? null),
        limitAmountMinor: r.limitAmountMinor,
        currency: workspaceCurrency,
      })),
    );
  }
}

async function importRules(tx: MoneyTx, ctx: MoneyCtx, rows: RuleRow[]) {
  if (rows.length === 0) return;

  const accountIds = [
    ...new Set(rows.map((r) => r.match.accountId).filter((id): id is string => Boolean(id))),
  ];
  if (accountIds.length) {
    await assertAccountsInWorkspaceTx(tx, ctx.workspaceId, accountIds);
  }

  const merchantIds = [
    ...new Set(rows.map((r) => r.match.merchantId).filter((id): id is string => Boolean(id))),
  ];
  if (merchantIds.length) {
    await assertMerchantsInWorkspaceTx(tx, ctx.workspaceId, merchantIds);
  }

  for (const r of rows) {
    if (r.action.setCategoryId) {
      await assertCategoriesKindMatchTx(
        tx,
        ctx.workspaceId,
        [r.action.setCategoryId],
        r.kind,
      );
    }
  }

  const tagIds = [
    ...new Set(rows.flatMap((r) => r.action.tagIds ?? []).filter(Boolean)),
  ];
  if (tagIds.length) {
    await assertTagsInWorkspaceTx(tx, ctx.workspaceId, tagIds);
  }

  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await tx.insert(moneyRule).values(
      chunk.map((r) => ({
        workspaceId: ctx.workspaceId,
        name: r.name,
        kind: r.kind,
        priority: r.priority ?? 0,
        match: r.match,
        action: r.action,
        active: r.active ?? true,
      })),
    );
  }
}

async function importRecurrence(
  tx: MoneyTx,
  ctx: MoneyCtx,
  rows: RecurrenceRow[],
) {
  if (rows.length === 0) return;

  const accountIds = [
    ...new Set(rows.map((r) => r.template.accountId).filter(Boolean)),
  ];
  if (accountIds.length) {
    await assertAccountsInWorkspaceTx(tx, ctx.workspaceId, accountIds);
  }

  for (const r of rows) {
    const t = r.template;
    if (t.categoryId) {
      if (t.kind === "transfer") {
        throw new Error("Transfer templates cannot reference a category");
      }
      const expected = categoryKindForTransactionKind(t.kind);
      if (expected) {
        await assertCategoriesKindMatchTx(
          tx,
          ctx.workspaceId,
          [t.categoryId],
          expected,
        );
      }
    }
  }

  const merchantIds = [
    ...new Set(rows.map((r) => r.template.merchantId).filter((id): id is string => Boolean(id))),
  ];
  if (merchantIds.length) {
    await assertMerchantsInWorkspaceTx(tx, ctx.workspaceId, merchantIds);
  }

  const tagIds = [
    ...new Set(rows.flatMap((r) => r.template.tagIds ?? []).filter(Boolean)),
  ];
  if (tagIds.length) {
    await assertTagsInWorkspaceTx(tx, ctx.workspaceId, tagIds);
  }

  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await tx.insert(moneyRecurrentTemplate).values(
      chunk.map((r) => ({
        workspaceId: ctx.workspaceId,
        name: r.name,
        cadence: r.cadence,
        nextRunAt: new Date(r.nextRunAt),
        template: r.template,
        active: r.active ?? true,
      })),
    );
  }
}

async function importTransactions(
  tx: MoneyTx,
  ctx: MoneyCtx,
  rows: TransactionImportRow[],
) {
  const pairByGroup = new Map<string, string>();
  for (const r of rows) {
    if (r.transferGroupId && r.kind === "transfer") {
      if (!pairByGroup.has(r.transferGroupId)) {
        pairByGroup.set(r.transferGroupId, randomUUID());
      }
    }
  }

  const allAccountIds = [
    ...new Set(rows.map((r) => r.accountId).filter(Boolean)),
  ];
  if (allAccountIds.length) {
    await assertAccountsInWorkspaceTx(tx, ctx.workspaceId, allAccountIds);
  }

  const allMerchantIds = [
    ...new Set(
      rows.map((r) => r.merchantId).filter((id): id is string => Boolean(id)),
    ),
  ];
  if (allMerchantIds.length) {
    await assertMerchantsInWorkspaceTx(tx, ctx.workspaceId, allMerchantIds);
  }

  const allBaseTagIds = [
    ...new Set(rows.flatMap((r) => r.tagIds ?? []).filter(Boolean)),
  ];
  if (allBaseTagIds.length) {
    await assertTagsInWorkspaceTx(tx, ctx.workspaceId, allBaseTagIds);
  }

  const allCategoryIds = [
    ...new Set(
      rows.map((r) => r.categoryId).filter((id): id is string => Boolean(id)),
    ),
  ];
  let catMap = new Map<string, { id: string; kind: "expense" | "income" }>();
  if (allCategoryIds.length) {
    const catRows = await tx
      .select({ id: moneyCategory.id, kind: moneyCategory.kind })
      .from(moneyCategory)
      .where(
        and(
          eq(moneyCategory.workspaceId, ctx.workspaceId),
          inArray(moneyCategory.id, allCategoryIds),
        ),
      );
    if (catRows.length !== allCategoryIds.length) {
      throw new Error("One or more categories are missing in this workspace");
    }
    catMap = new Map(catRows.map((c) => [c.id, c]));
  }

  const allRawTagNames = [
    ...new Set(
      rows
        .flatMap((r) => r.tagNames ?? [])
        .map((n) => n.trim())
        .filter((n) => n.length > 0),
    ),
  ];
  const tagIdByName = new Map<string, string>();
  if (allRawTagNames.length > 0) {
    const existingTags = await tx
      .select({ id: moneyTag.id, name: moneyTag.name })
      .from(moneyTag)
      .where(
        and(
          eq(moneyTag.workspaceId, ctx.workspaceId),
          inArray(moneyTag.name, allRawTagNames),
        ),
      );
    for (const t of existingTags) {
      tagIdByName.set(t.name, t.id);
    }
    const toCreate = allRawTagNames.filter((name) => !tagIdByName.has(name));
    if (toCreate.length > 0) {
      const insertedTags = await tx
        .insert(moneyTag)
        .values(
          toCreate.map((name) => ({ workspaceId: ctx.workspaceId, name })),
        )
        .returning({ id: moneyTag.id, name: moneyTag.name });
      for (const t of insertedTags) {
        tagIdByName.set(t.name, t.id);
      }
    }
  }

  const txValues: Array<typeof moneyTransaction.$inferInsert> = [];
  const tagMapping: Array<{ txIndex: number; tagIds: string[] }> = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    let txKind = r.kind ?? "expense";
    if (r.categoryId) {
      if (txKind === "transfer") {
        throw new Error("Transfer transactions cannot reference a category");
      }
      const catRow = catMap.get(r.categoryId);
      if (!catRow) {
        throw new Error("One or more categories are missing in this workspace");
      }
      txKind = catRow.kind;
      const expected = categoryKindForTransactionKind(txKind);
      if (expected && catRow.kind !== expected) {
        throw new Error(
          `Category kind '${catRow.kind}' does not match expected '${expected}'`,
        );
      }
    }

    const baseTagIds = [...new Set(r.tagIds ?? [])];
    const normalizedTagNames = [
      ...new Set(
        (r.tagNames ?? [])
          .map((n) => n.trim())
          .filter((n) => n.length > 0),
      ),
    ];
    if (normalizedTagNames.length > 50) {
      throw new Error("Too many tag names on one transaction");
    }

    const occurredAt = r.occurredAt ? new Date(r.occurredAt) : new Date();
    const transferPairId =
      r.transferGroupId && r.kind === "transfer"
        ? (pairByGroup.get(r.transferGroupId) ?? null)
        : null;

    const fromNames = normalizedTagNames
      .map((name) => tagIdByName.get(name))
      .filter((id): id is string => Boolean(id));

    const uniqueTags = [...new Set([...baseTagIds, ...fromNames])];

    txValues.push({
      workspaceId: ctx.workspaceId,
      accountId: r.accountId,
      kind: txKind,
      amountMinor: r.amountMinor,
      occurredAt,
      categoryId: r.categoryId ?? null,
      merchantId: r.merchantId ?? null,
      notes: r.notes ?? null,
      createdBySub: ctx.userSub,
      transferPairId,
    });
    if (uniqueTags.length) {
      tagMapping.push({ txIndex: i, tagIds: uniqueTags });
    }
  }

  if (txValues.length === 0) return;

  const insertedRows: Array<typeof moneyTransaction.$inferSelect> = [];
  const chunkSize = 200;
  for (let i = 0; i < txValues.length; i += chunkSize) {
    const chunk = txValues.slice(i, i + chunkSize);
    const chunkInserted = await tx
      .insert(moneyTransaction)
      .values(chunk)
      .returning();
    insertedRows.push(...chunkInserted);
  }

  const tagLinksToInsert: Array<{ transactionId: string; tagId: string }> = [];
  for (const item of tagMapping) {
    const insertedTx = insertedRows[item.txIndex];
    if (insertedTx) {
      for (const tagId of item.tagIds) {
        tagLinksToInsert.push({ transactionId: insertedTx.id, tagId });
      }
    }
  }
  if (tagLinksToInsert.length > 0) {
    for (let i = 0; i < tagLinksToInsert.length; i += chunkSize) {
      const chunk = tagLinksToInsert.slice(i, i + chunkSize);
      await tx.insert(moneyTransactionTag).values(chunk);
    }
  }

  const transferPairs = new Map<string, TxRowForBalance[]>();
  const balanceRows: TxRowForBalance[] = insertedRows.map((r) => ({
    id: r.id,
    accountId: r.accountId,
    kind: r.kind,
    amountMinor: r.amountMinor,
    occurredAt: r.occurredAt,
    createdAt: r.createdAt,
    transferPairId: r.transferPairId,
  }));

  for (const br of balanceRows) {
    if (br.kind === "transfer" && br.transferPairId) {
      const list = transferPairs.get(br.transferPairId) ?? [];
      list.push(br);
      transferPairs.set(br.transferPairId, list);
    }
  }

  const deltasByAccount = new Map<string, number>();
  for (const br of balanceRows) {
    let delta = 0;
    if (br.kind === "expense") {
      delta = -br.amountMinor;
    } else if (br.kind === "income") {
      delta = br.amountMinor;
    } else if (br.kind === "transfer") {
      if (br.transferPairId) {
        const pair = transferPairs.get(br.transferPairId);
        const sorted = pair ? sortTransferPairRows(pair) : null;
        delta = effectOnAccount(br, sorted);
      } else {
        delta = -br.amountMinor;
      }
    }
    const cur = deltasByAccount.get(br.accountId) ?? 0;
    deltasByAccount.set(br.accountId, cur + delta);
  }

  await applyBalanceDeltas(tx, ctx.workspaceId, deltasByAccount);
}

export async function commitMoneyImport(
  ctx: MoneyCtx,
  type: MoneyImportType,
  rows: unknown[],
): Promise<number> {
  return db.transaction(async (tx) => {
    switch (type) {
      case "accounts": {
        const list = rows as AccountRow[];
        await importAccounts(tx, ctx, list);
        return list.length;
      }
      case "categories": {
        const list = rows as CategoryImportRow[];
        await importCategories(tx, ctx, list);
        return list.length;
      }
      case "budgets": {
        const list = rows as BudgetRow[];
        await importBudgets(tx, ctx, list);
        return list.length;
      }
      case "rules": {
        const list = rows as RuleRow[];
        await importRules(tx, ctx, list);
        return list.length;
      }
      case "recurrence": {
        const list = rows as RecurrenceRow[];
        await importRecurrence(tx, ctx, list);
        return list.length;
      }
      case "transactions": {
        const list = rows as TransactionImportRow[];
        await importTransactions(tx, ctx, list);
        return list.length;
      }
      default: {
        const _e: never = type;
        return _e;
      }
    }
  });
}
