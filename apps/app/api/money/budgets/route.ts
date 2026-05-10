import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  moneyBudget,
  moneyCategory,
  moneyTransaction,
  moneyTransactionTag,
} from "@/db/schema/money";
import { badRequest, requireMoneyContext } from "@/lib/api-money";
import { assertBudgetTargetInWorkspace, type BudgetScope } from "@/lib/money-budget-target";
import { getWorkspaceDefaultCurrency } from "@/lib/workspace";
import { budgetCreateSchema } from "@/lib/validators/money";

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

async function ensureBudgetScopeColumnsIfMissing() {
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'money_budget_scope'
          AND n.nspname = current_schema()
      ) THEN
        CREATE TYPE money_budget_scope AS ENUM ('workspace', 'category', 'account', 'tag');
      END IF;
    END
    $$;
  `);

  await db.execute(sql`
    ALTER TABLE money_budget
      ADD COLUMN IF NOT EXISTS scope_type money_budget_scope;
  `);
  await db.execute(sql`
    ALTER TABLE money_budget
      ADD COLUMN IF NOT EXISTS scope_id uuid;
  `);

  await db.execute(sql`
    UPDATE money_budget
    SET scope_type = CASE WHEN category_id IS NULL THEN 'workspace'::money_budget_scope ELSE 'category'::money_budget_scope END,
        scope_id = category_id
    WHERE scope_type IS NULL;
  `);

  await db.execute(sql`
    ALTER TABLE money_budget
      ALTER COLUMN scope_type SET NOT NULL;
  `);
}

async function alignLegacyBudgetColumnsForScopedModel() {
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'money_budget'
          AND column_name = 'period_start'
      ) THEN
        ALTER TABLE money_budget ALTER COLUMN period_start DROP NOT NULL;
      END IF;
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'money_budget'
          AND column_name = 'period_end'
      ) THEN
        ALTER TABLE money_budget ALTER COLUMN period_end DROP NOT NULL;
      END IF;
    END
    $$;
  `);
}

async function loadBudgetRowsCompat(workspaceId: string): Promise<BudgetApiRow[]> {
  try {
    const rows = await db
      .select()
      .from(moneyBudget)
      .where(eq(moneyBudget.workspaceId, workspaceId))
      .orderBy(asc(moneyBudget.scopeType), asc(moneyBudget.scopeId));
    return rows;
  } catch (e) {
    const directCode =
      e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "";
    const causeCode =
      e &&
      typeof e === "object" &&
      "cause" in e &&
      (e as { cause?: unknown }).cause &&
      typeof (e as { cause?: unknown }).cause === "object" &&
      "code" in ((e as { cause?: unknown }).cause as { code?: unknown })
        ? String(((e as { cause?: unknown }).cause as { code?: unknown }).code ?? "")
        : "";
    const msg = e instanceof Error ? e.message : "";
    const isMissingScopeType =
      directCode === "42703" ||
      causeCode === "42703" ||
      msg.includes("scope_type") ||
      msg.includes("column \"scope_type\" does not exist");
    if (!isMissingScopeType) throw e;

    let legacy: Array<Record<string, unknown>> = [];
    try {
      const legacyRaw = await db.execute(sql`
        select id, workspace_id, category_id, limit_amount_minor, currency, created_at
        from money_budget
        where workspace_id = ${workspaceId}
        order by category_id asc nulls first
      `);
      const maybeRows = (
        legacyRaw as unknown as
          | Array<Record<string, unknown>>
          | { rows?: Array<Record<string, unknown>> }
      );
      legacy = Array.isArray(maybeRows) ? maybeRows : (maybeRows.rows ?? []);
    } catch (legacyErr) {
      throw legacyErr;
    }
    return legacy.map((r) => ({
      id: String(r.id),
      workspaceId: String(r.workspace_id),
      scopeType: r.category_id ? "category" : "workspace",
      scopeId: r.category_id ? String(r.category_id) : null,
      limitAmountMinor: Number(r.limit_amount_minor ?? 0),
      currency: String(r.currency ?? "USD"),
      createdAt: new Date(String(r.created_at)),
    }));
  }
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

export async function GET(req: Request) {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const includeSpent = url.searchParams.get("includeSpent") === "1";

  const rows = await loadBudgetRowsCompat(ctx.workspaceId);
  const workspaceCurrency =
    (await getWorkspaceDefaultCurrency(ctx.workspaceId)) ?? "USD";

  if (!includeSpent) {
    return NextResponse.json({
      data: rows.map((r) => serializeBudgetRow(r, workspaceCurrency)),
    });
  }

  const categoryRows = await db
    .select({
      id: moneyCategory.id,
      parentId: moneyCategory.parentId,
    })
    .from(moneyCategory)
    .where(eq(moneyCategory.workspaceId, ctx.workspaceId));

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
      ? await loadSpentAggregates(ctx.workspaceId, fromDate, toDate)
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

  return NextResponse.json({ data: enriched });
}

export async function POST(req: Request) {
  const ctx = await requireMoneyContext();
  if ("error" in ctx) return ctx.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const parsed = budgetCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const scopeId =
    parsed.data.scopeType === "workspace" ? null : (parsed.data.scopeId ?? null);
  const err = await assertBudgetTargetInWorkspace(
    ctx.workspaceId,
    parsed.data.scopeType,
    scopeId,
  );
  if (err) return badRequest(err);

  try {
    const budgetColsRaw = await db.execute(sql`
      select current_schema() as current_schema,
             current_database() as current_database,
             exists (
               select 1
               from information_schema.columns
               where table_schema = current_schema()
                 and table_name = 'money_budget'
                 and column_name = 'scope_type'
             ) as has_scope_type,
             exists (
               select 1
               from information_schema.columns
               where table_schema = current_schema()
                 and table_name = 'money_budget'
                 and column_name = 'scope_id'
             ) as has_scope_id
    `);
    const budgetColsRows = (
      budgetColsRaw as unknown as
        | Array<Record<string, unknown>>
        | { rows?: Array<Record<string, unknown>> }
    );
    const budgetCols = Array.isArray(budgetColsRows)
      ? budgetColsRows[0]
      : budgetColsRows.rows?.[0];

    if (!budgetCols?.has_scope_type || !budgetCols?.has_scope_id) {
      await ensureBudgetScopeColumnsIfMissing();
    }
    await alignLegacyBudgetColumnsForScopedModel();

    const workspaceCurrency =
      (await getWorkspaceDefaultCurrency(ctx.workspaceId)) ?? "USD";
    const [created] = await db
      .insert(moneyBudget)
      .values({
        workspaceId: ctx.workspaceId,
        scopeType: parsed.data.scopeType,
        scopeId,
        limitAmountMinor: parsed.data.limitAmountMinor,
        currency: workspaceCurrency,
      })
      .returning();

    if (!created) return badRequest("Could not create budget");

    return NextResponse.json({
      data: serializeBudgetRow(created, workspaceCurrency),
    });
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "";
    if (code === "23505") {
      return badRequest("A budget already exists for this scope");
    }
    throw e;
  }
}
