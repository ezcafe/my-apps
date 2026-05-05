import { randomUUID } from "node:crypto";
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
  applyTransactionBalanceEffect,
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
  selfId?: string,
): Promise<string | null> {
  if (selfId && parentId === selfId) {
    return "Category cannot be its own parent";
  }
  const rows = await tx
    .select({
      id: moneyCategory.id,
      parentId: moneyCategory.parentId,
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
  return null;
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
  for (const r of rows) {
    await tx.insert(moneyAccount).values({
      workspaceId: ctx.workspaceId,
      name: r.name,
      type: r.type ?? "checking",
      currency: r.currency ?? "USD",
      institution: r.institution ?? null,
      balanceMinor: r.balanceMinor ?? 0,
      sortOrder: r.sortOrder ?? 0,
      archived: r.archived ?? false,
    });
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
        );
        if (perr) throw new Error(perr);
      } else if (c.parentId) {
        const perr = await assertValidCategoryParentTx(
          tx,
          ctx.workspaceId,
          c.parentId,
        );
        if (perr) throw new Error(perr);
        parentDbId = c.parentId;
      }

      const [ins] = await tx
        .insert(moneyCategory)
        .values({
          workspaceId: ctx.workspaceId,
          name: c.name,
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
  for (const r of rows) {
    if (r.categoryId) {
      await assertCategoriesInWorkspaceTx(tx, ctx.workspaceId, [r.categoryId]);
    }
    await tx.insert(moneyBudget).values({
      workspaceId: ctx.workspaceId,
      categoryId: r.categoryId ?? null,
      periodStart: new Date(r.periodStart),
      periodEnd: new Date(r.periodEnd),
      limitAmountMinor: r.limitAmountMinor,
      currency: r.currency ?? "USD",
    });
  }
}

async function importRules(tx: MoneyTx, ctx: MoneyCtx, rows: RuleRow[]) {
  for (const r of rows) {
    const match = r.match;
    if (match.accountId) {
      await assertAccountsInWorkspaceTx(tx, ctx.workspaceId, [match.accountId]);
    }
    if (match.merchantId) {
      await assertMerchantsInWorkspaceTx(tx, ctx.workspaceId, [match.merchantId]);
    }
    const action = r.action;
    if (action.setCategoryId) {
      await assertCategoriesInWorkspaceTx(tx, ctx.workspaceId, [
        action.setCategoryId,
      ]);
    }
    if (action.tagIds?.length) {
      await assertTagsInWorkspaceTx(tx, ctx.workspaceId, action.tagIds);
    }

    await tx.insert(moneyRule).values({
      workspaceId: ctx.workspaceId,
      name: r.name,
      priority: r.priority ?? 0,
      match: r.match,
      action: r.action,
      active: r.active ?? true,
    });
  }
}

async function importRecurrence(
  tx: MoneyTx,
  ctx: MoneyCtx,
  rows: RecurrenceRow[],
) {
  for (const r of rows) {
    const t = r.template;
    await assertAccountsInWorkspaceTx(tx, ctx.workspaceId, [t.accountId]);
    if (t.categoryId) {
      await assertCategoriesInWorkspaceTx(tx, ctx.workspaceId, [t.categoryId]);
    }
    if (t.merchantId) {
      await assertMerchantsInWorkspaceTx(tx, ctx.workspaceId, [t.merchantId]);
    }
    if (t.tagIds?.length) {
      await assertTagsInWorkspaceTx(tx, ctx.workspaceId, t.tagIds);
    }

    await tx.insert(moneyRecurrentTemplate).values({
      workspaceId: ctx.workspaceId,
      name: r.name,
      cadence: r.cadence,
      nextRunAt: new Date(r.nextRunAt),
      template: r.template,
      active: r.active ?? true,
    });
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

  for (const r of rows) {
    await assertAccountsInWorkspaceTx(tx, ctx.workspaceId, [r.accountId]);
    if (r.categoryId) {
      await assertCategoriesInWorkspaceTx(tx, ctx.workspaceId, [r.categoryId]);
    }
    if (r.merchantId) {
      await assertMerchantsInWorkspaceTx(tx, ctx.workspaceId, [r.merchantId]);
    }
    const baseTagIds = [...new Set(r.tagIds ?? [])];
    if (baseTagIds.length) {
      await assertTagsInWorkspaceTx(tx, ctx.workspaceId, baseTagIds);
    }

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

    const [row] = await tx
      .insert(moneyTransaction)
      .values({
        workspaceId: ctx.workspaceId,
        accountId: r.accountId,
        kind: r.kind ?? "expense",
        amountMinor: r.amountMinor,
        occurredAt,
        categoryId: r.categoryId ?? null,
        merchantId: r.merchantId ?? null,
        notes: r.notes ?? null,
        createdBySub: ctx.userSub,
        transferPairId,
      })
      .returning();

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

    if (uniqueTags.length) {
      await tx.insert(moneyTransactionTag).values(
        uniqueTags.map((tagId) => ({
          transactionId: row.id,
          tagId,
        })),
      );
    }
  }
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
