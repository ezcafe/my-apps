import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  moneyBudget,
  moneyCategory,
  moneyTransaction,
  moneyTransactionTag,
} from "@/db/schema/money";
import {
  buildCategoryBudgetStatusRows,
  type CategoryBudgetStatusRow,
} from "@/lib/money-category-budget-status";
import {
  assertBudgetTargetInWorkspace,
  type BudgetScope,
} from "@/lib/money-budget-target";
import { getWorkspaceDefaultCurrency } from "@/lib/workspace";
import {
  budgetCreateSchema,
  moneyBudgetScopeTypeSchema,
} from "@/lib/validators/money";
import {
  moneyTransactionIncludedInReportsCondition,
} from "@/lib/money-transaction-analytics-conditions";
import { z } from "zod";

function serializeBudgetRow(
  r: {
    id: string;
    workspaceId: string;
    scopeType: BudgetScope;
    scopeId: string | null;
    limitAmountMinor: number;
    currency: string;
    createdAt: Date;
  },
  workspaceCurrency: string,
) {
  return {
    id: r.id,
    workspaceId: r.workspaceId,
    scopeType: r.scopeType,
    scopeId: r.scopeId,
    limitAmountMinor: r.limitAmountMinor,
    currency: workspaceCurrency,
    createdAt: r.createdAt.toISOString(),
  };
}

type BudgetApiRow = {
  id: string;
  workspaceId: string;
  scopeType: BudgetScope;
  scopeId: string | null;
  limitAmountMinor: number;
  currency: string;
  createdAt: Date;
};

async function loadBudgetRowsCompat(workspaceId: string): Promise<BudgetApiRow[]> {
  return db
    .select()
    .from(moneyBudget)
    .where(eq(moneyBudget.workspaceId, workspaceId))
    .orderBy(asc(moneyBudget.scopeType), asc(moneyBudget.scopeId));
}

type SpentAggregates = {
  workspaceTotal: number;
  byAccountId: Map<string, number>;
  /** Direct spend per category id (excludes null/uncategorized rows). */
  byCategoryId: Map<string, number>;
  byTagId: Map<string, number>;
};

/** One parallel batch of grouped queries for all budget scopes in a date range. */
async function loadSpentAggregates(
  workspaceId: string,
  fromDate: Date,
  toDate: Date,
): Promise<SpentAggregates> {
  const rangeCond = and(
    eq(moneyTransaction.workspaceId, workspaceId),
    eq(moneyTransaction.kind, "expense"),
    gte(moneyTransaction.occurredAt, fromDate),
    lte(moneyTransaction.occurredAt, toDate),
    moneyTransactionIncludedInReportsCondition(),
  );

  const [wsRows, accountRows, categoryRows, tagRows] = await Promise.all([
    db
      .select({
        total: sql<string>`coalesce(sum(${moneyTransaction.amountMinor}), 0)`,
      })
      .from(moneyTransaction)
      .where(rangeCond),
    db
      .select({
        accountId: moneyTransaction.accountId,
        total: sql<string>`coalesce(sum(${moneyTransaction.amountMinor}), 0)`,
      })
      .from(moneyTransaction)
      .where(rangeCond)
      .groupBy(moneyTransaction.accountId),
    db
      .select({
        categoryId: moneyTransaction.categoryId,
        total: sql<string>`coalesce(sum(${moneyTransaction.amountMinor}), 0)`,
      })
      .from(moneyTransaction)
      .where(rangeCond)
      .groupBy(moneyTransaction.categoryId),
    db
      .select({
        tagId: moneyTransactionTag.tagId,
        total: sql<string>`coalesce(sum(${moneyTransaction.amountMinor}), 0)`,
      })
      .from(moneyTransaction)
      .innerJoin(
        moneyTransactionTag,
        eq(moneyTransactionTag.transactionId, moneyTransaction.id),
      )
      .where(rangeCond)
      .groupBy(moneyTransactionTag.tagId),
  ]);

  const workspaceTotal = Number(wsRows[0]?.total ?? 0);
  const byAccountId = new Map(
    accountRows.map((r) => [r.accountId, Number(r.total)]),
  );
  const byCategoryId = new Map<string, number>();
  for (const r of categoryRows) {
    if (r.categoryId == null) continue;
    byCategoryId.set(r.categoryId, Number(r.total));
  }
  const byTagId = new Map(tagRows.map((r) => [r.tagId, Number(r.total)]));

  return { workspaceTotal, byAccountId, byCategoryId, byTagId };
}

function spentMinorForBudgetRow(
  r: BudgetApiRow,
  agg: SpentAggregates,
  descendantsByCategory: Map<string, string[]>,
): number {
  switch (r.scopeType) {
    case "workspace":
      return agg.workspaceTotal;
    case "account":
      return r.scopeId ? (agg.byAccountId.get(r.scopeId) ?? 0) : 0;
    case "tag":
      return r.scopeId ? (agg.byTagId.get(r.scopeId) ?? 0) : 0;
    case "category": {
      if (!r.scopeId) return 0;
      const ids = descendantsByCategory.get(r.scopeId) ?? [r.scopeId];
      let sum = 0;
      for (const id of ids) {
        sum += agg.byCategoryId.get(id) ?? 0;
      }
      return sum;
    }
    default:
      return 0;
  }
}

export type BudgetListRowBase = ReturnType<typeof serializeBudgetRow>;
export type BudgetListRowEnriched = BudgetListRowBase & {
  spentAmountMinor: number;
  effectiveLimitAmountMinor: number;
  progressPct: number;
  overBudget: boolean;
};

export async function listMoneyBudgets(
  workspaceId: string,
  opts: {
    includeSpent: boolean;
    from: string | null;
    to: string | null;
  },
): Promise<BudgetListRowBase[] | BudgetListRowEnriched[]> {
  const { includeSpent, from, to } = opts;

  const rows = await loadBudgetRowsCompat(workspaceId);
  const workspaceCurrency =
    (await getWorkspaceDefaultCurrency(workspaceId)) ?? "USD";

  if (!includeSpent) {
    return rows.map((r) => serializeBudgetRow(r, workspaceCurrency));
  }

  const categoryRows = await db
    .select({
      id: moneyCategory.id,
      parentId: moneyCategory.parentId,
    })
    .from(moneyCategory)
    .where(eq(moneyCategory.workspaceId, workspaceId));

  const childrenByParent = new Map<string, string[]>();
  for (const c of categoryRows) {
    if (!c.parentId) continue;
    const arr = childrenByParent.get(c.parentId) ?? [];
    arr.push(c.id);
    childrenByParent.set(c.parentId, arr);
  }

  const descendantsByCategory = new Map<string, string[]>();
  for (const c of categoryRows) {
    const visited = new Set<string>([c.id]);
    const queue = [c.id];
    while (queue.length > 0) {
      const cur = queue.shift();
      if (!cur) continue;
      for (const child of childrenByParent.get(cur) ?? []) {
        if (visited.has(child)) continue;
        visited.add(child);
        queue.push(child);
      }
    }
    descendantsByCategory.set(c.id, [...visited]);
  }

  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;

  const agg =
    fromDate && toDate && fromDate <= toDate
      ? await loadSpentAggregates(workspaceId, fromDate, toDate)
      : null;

  const enriched = rows.map((r) => {
    const spentAmountMinor = agg
      ? spentMinorForBudgetRow(r, agg, descendantsByCategory)
      : 0;

    const effectiveLimitAmountMinor = r.limitAmountMinor;
    const progressPct =
      effectiveLimitAmountMinor > 0
        ? Math.round((spentAmountMinor / effectiveLimitAmountMinor) * 10000) / 100
        : 0;

    return {
      ...serializeBudgetRow(r, workspaceCurrency),
      spentAmountMinor,
      effectiveLimitAmountMinor,
      progressPct,
      overBudget: spentAmountMinor > effectiveLimitAmountMinor,
    };
  });

  return enriched;
}

export type { CategoryBudgetStatusRow };

export type AccountBudgetStatusRow = {
  accountId: string;
  progressPct: number;
};

export type TagBudgetStatusRow = {
  tagId: string;
  progressPct: number;
};

export type FormBudgetStatusPayload = {
  categories: CategoryBudgetStatusRow[];
  accounts: AccountBudgetStatusRow[];
  tags: TagBudgetStatusRow[];
};

export async function listMoneyFormBudgetStatus(
  workspaceId: string,
  from: string,
  to: string,
): Promise<FormBudgetStatusPayload> {
  const budgets = (await listMoneyBudgets(workspaceId, {
    includeSpent: true,
    from,
    to,
  })) as BudgetListRowEnriched[];

  const directPctByCategoryId = new Map<string, number>();
  const accounts: AccountBudgetStatusRow[] = [];
  const tags: TagBudgetStatusRow[] = [];
  for (const b of budgets) {
    if (b.scopeType === "category" && b.scopeId) {
      directPctByCategoryId.set(b.scopeId, b.progressPct);
    } else if (b.scopeType === "account" && b.scopeId) {
      accounts.push({ accountId: b.scopeId, progressPct: b.progressPct });
    } else if (b.scopeType === "tag" && b.scopeId) {
      tags.push({ tagId: b.scopeId, progressPct: b.progressPct });
    }
  }

  let categories: CategoryBudgetStatusRow[] = [];
  if (directPctByCategoryId.size > 0) {
    const categoryRows = await db
      .select({
        id: moneyCategory.id,
        parentId: moneyCategory.parentId,
      })
      .from(moneyCategory)
      .where(eq(moneyCategory.workspaceId, workspaceId));

    const parentIdByCategoryId = new Map(
      categoryRows.map((c) => [c.id, c.parentId]),
    );

    categories = buildCategoryBudgetStatusRows(
      directPctByCategoryId,
      parentIdByCategoryId,
    );
  }

  return { categories, accounts, tags };
}

/** @deprecated Use listMoneyFormBudgetStatus — kept for narrow callers. */
export async function listMoneyCategoryBudgetStatus(
  workspaceId: string,
  from: string,
  to: string,
): Promise<CategoryBudgetStatusRow[]> {
  const { categories } = await listMoneyFormBudgetStatus(workspaceId, from, to);
  return categories;
}

export async function createMoneyBudget(
  workspaceId: string,
  body: unknown,
): Promise<BudgetListRowBase> {
  const parsed = budgetCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const scopeId =
    parsed.data.scopeType === "workspace" ? null : (parsed.data.scopeId ?? null);
  const err = await assertBudgetTargetInWorkspace(
    workspaceId,
    parsed.data.scopeType,
    scopeId,
  );
  if (err) throw new Error(err);

  try {
    const workspaceCurrency =
      (await getWorkspaceDefaultCurrency(workspaceId)) ?? "USD";
    const [created] = await db
      .insert(moneyBudget)
      .values({
        workspaceId,
        scopeType: parsed.data.scopeType,
        scopeId,
        limitAmountMinor: parsed.data.limitAmountMinor,
        currency: workspaceCurrency,
      })
      .returning();

    if (!created) throw new Error("Could not create budget");

    return serializeBudgetRow(created, workspaceCurrency);
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "";
    if (code === "23505") {
      throw new Error("A budget already exists for this scope");
    }
    throw e;
  }
}

const budgetPatchSchema = z
  .object({
    scopeType: moneyBudgetScopeTypeSchema.optional(),
    scopeId: z.string().uuid().nullable().optional(),
    limitAmountMinor: z.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.scopeType === "workspace" &&
      data.scopeId != null &&
      data.scopeId !== ""
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scopeId"],
        message: "scopeId must be omitted for workspace budgets",
      });
    }
  });

export async function updateMoneyBudget(
  workspaceId: string,
  id: string,
  body: unknown,
): Promise<BudgetListRowBase> {
  const parsed = budgetPatchSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  if (Object.keys(parsed.data).length === 0) {
    throw new Error("No updates");
  }

  const [existing] = await db
    .select()
    .from(moneyBudget)
    .where(and(eq(moneyBudget.id, id), eq(moneyBudget.workspaceId, workspaceId)))
    .limit(1);

  if (!existing) throw new Error("NOT_FOUND");

  const nextScopeType = parsed.data.scopeType ?? existing.scopeType;
  let nextScopeId: string | null;
  if (nextScopeType === "workspace") {
    nextScopeId = null;
  } else if (parsed.data.scopeId !== undefined) {
    nextScopeId = parsed.data.scopeId;
  } else if (parsed.data.scopeType !== undefined) {
    nextScopeId = existing.scopeId;
  } else {
    nextScopeId = existing.scopeId;
  }

  const merged = {
    scopeType: nextScopeType,
    scopeId: nextScopeId,
    limitAmountMinor: parsed.data.limitAmountMinor ?? existing.limitAmountMinor,
    currency: existing.currency,
  };

  const full = budgetCreateSchema.safeParse(merged);
  if (!full.success) {
    throw new Error(
      full.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const resolvedScopeId =
    full.data.scopeType === "workspace" ? null : (full.data.scopeId ?? null);
  const targetErr = await assertBudgetTargetInWorkspace(
    workspaceId,
    full.data.scopeType,
    resolvedScopeId,
  );
  if (targetErr) throw new Error(targetErr);

  try {
    const [updated] = await db
      .update(moneyBudget)
      .set({
        scopeType: full.data.scopeType,
        scopeId: resolvedScopeId,
        limitAmountMinor: full.data.limitAmountMinor,
      })
      .where(and(eq(moneyBudget.id, id), eq(moneyBudget.workspaceId, workspaceId)))
      .returning();

    if (!updated) throw new Error("NOT_FOUND");
    const workspaceCurrency =
      (await getWorkspaceDefaultCurrency(workspaceId)) ?? "USD";

    return serializeBudgetRow(updated, workspaceCurrency);
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code: unknown }).code)
        : "";
    if (code === "23505") {
      throw new Error("A budget already exists for this scope");
    }
    throw e;
  }
}

export async function deleteMoneyBudget(
  workspaceId: string,
  id: string,
): Promise<boolean> {
  const deleted = await db
    .delete(moneyBudget)
    .where(
      and(eq(moneyBudget.id, id), eq(moneyBudget.workspaceId, workspaceId)),
    )
    .returning({ id: moneyBudget.id });

  return deleted.length > 0;
}
