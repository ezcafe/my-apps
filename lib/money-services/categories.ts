import { and, asc, desc, eq, getTableColumns, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { moneyCategory, moneyTransaction } from "@/db/schema/money";
import { assertValidCategoryParent } from "@/lib/money-category-parent";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  type CategoryKind,
} from "@/lib/validators/money";
import type { MoneyWorkspaceCtx } from "@/lib/money-services/types";

const USAGE_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

export async function listMoneyCategories(
  workspaceId: string,
  filters?: { kind?: CategoryKind },
) {
  const since = new Date(Date.now() - USAGE_WINDOW_MS);
  const whereExpr = filters?.kind
    ? and(
        eq(moneyCategory.workspaceId, workspaceId),
        eq(moneyCategory.kind, filters.kind),
      )
    : eq(moneyCategory.workspaceId, workspaceId);

  const rows = await db
    .select({
      ...getTableColumns(moneyCategory),
      usageCount: sql<number>`count(${moneyTransaction.id})::int`.as("usage_count"),
    })
    .from(moneyCategory)
    .leftJoin(
      moneyTransaction,
      and(
        eq(moneyTransaction.categoryId, moneyCategory.id),
        eq(moneyTransaction.workspaceId, workspaceId),
        gte(moneyTransaction.occurredAt, since),
      ),
    )
    .where(whereExpr)
    .groupBy(moneyCategory.id)
    .orderBy(desc(sql`usage_count`), asc(moneyCategory.name));

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createMoneyCategory(ctx: MoneyWorkspaceCtx, body: unknown) {
  const parsed = categoryCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  if (parsed.data.parentId) {
    const err = await assertValidCategoryParent(
      ctx.workspaceId,
      parsed.data.parentId,
      parsed.data.kind,
    );
    if (err) throw new Error(err);
  }

  const [created] = await db
    .insert(moneyCategory)
    .values({
      workspaceId: ctx.workspaceId,
      name: parsed.data.name,
      kind: parsed.data.kind,
      parentId: parsed.data.parentId ?? null,
    })
    .returning();

  return {
    ...created,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function updateMoneyCategory(
  ctx: MoneyWorkspaceCtx,
  id: string,
  body: unknown,
) {
  const parsed = categoryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const [existing] = await db
    .select({ id: moneyCategory.id, kind: moneyCategory.kind })
    .from(moneyCategory)
    .where(
      and(
        eq(moneyCategory.id, id),
        eq(moneyCategory.workspaceId, ctx.workspaceId),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("NOT_FOUND");

  if (parsed.data.parentId) {
    const err = await assertValidCategoryParent(
      ctx.workspaceId,
      parsed.data.parentId,
      existing.kind,
      id,
    );
    if (err) throw new Error(err);
  }

  const updates = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  );

  if (Object.keys(updates).length === 0) {
    throw new Error("No updates");
  }

  const [updated] = await db
    .update(moneyCategory)
    .set(updates)
    .where(
      and(
        eq(moneyCategory.id, id),
        eq(moneyCategory.workspaceId, ctx.workspaceId),
      ),
    )
    .returning();

  if (!updated) throw new Error("NOT_FOUND");

  return {
    ...updated,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function archiveMoneyCategory(
  ctx: MoneyWorkspaceCtx,
  id: string,
): Promise<boolean> {
  const [updated] = await db
    .update(moneyCategory)
    .set({ archived: true })
    .where(
      and(
        eq(moneyCategory.id, id),
        eq(moneyCategory.workspaceId, ctx.workspaceId),
      ),
    )
    .returning();

  return !!updated;
}
