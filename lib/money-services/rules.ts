import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { moneyRule } from "@/db/schema/money";
import { assertCategoryKindMatches } from "@/lib/money-category-kind-check";
import { ruleCreateSchema, ruleUpdateSchema } from "@/lib/validators/money";
import type { MoneyWorkspaceCtx } from "@/lib/money-services/types";

export async function listMoneyRules(workspaceId: string) {
  const rows = await db
    .select()
    .from(moneyRule)
    .where(eq(moneyRule.workspaceId, workspaceId))
    .orderBy(desc(moneyRule.priority), asc(moneyRule.name));

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createMoneyRule(ctx: MoneyWorkspaceCtx, body: unknown) {
  const parsed = ruleCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  if (parsed.data.action.setCategoryId) {
    await assertCategoryKindMatches(
      ctx.workspaceId,
      parsed.data.action.setCategoryId,
      parsed.data.kind,
    );
  }

  const [created] = await db
    .insert(moneyRule)
    .values({
      workspaceId: ctx.workspaceId,
      name: parsed.data.name,
      kind: parsed.data.kind,
      priority: parsed.data.priority ?? 0,
      match: parsed.data.match,
      action: parsed.data.action,
      active: parsed.data.active ?? true,
    })
    .returning();

  return {
    ...created,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function updateMoneyRule(
  ctx: MoneyWorkspaceCtx,
  id: string,
  body: unknown,
) {
  const parsed = ruleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join("; ") || "Validation failed",
    );
  }

  const updates = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  );

  if (Object.keys(updates).length === 0) {
    throw new Error("No updates");
  }

  if (parsed.data.action?.setCategoryId) {
    const [existing] = await db
      .select({ kind: moneyRule.kind })
      .from(moneyRule)
      .where(and(eq(moneyRule.id, id), eq(moneyRule.workspaceId, ctx.workspaceId)))
      .limit(1);
    if (!existing) throw new Error("NOT_FOUND");
    await assertCategoryKindMatches(
      ctx.workspaceId,
      parsed.data.action.setCategoryId,
      existing.kind,
    );
  }

  const [updated] = await db
    .update(moneyRule)
    .set(updates)
    .where(and(eq(moneyRule.id, id), eq(moneyRule.workspaceId, ctx.workspaceId)))
    .returning();

  if (!updated) throw new Error("NOT_FOUND");

  return {
    ...updated,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function deleteMoneyRule(
  ctx: MoneyWorkspaceCtx,
  id: string,
): Promise<boolean> {
  const deleted = await db
    .delete(moneyRule)
    .where(and(eq(moneyRule.id, id), eq(moneyRule.workspaceId, ctx.workspaceId)))
    .returning({ id: moneyRule.id });

  return deleted.length > 0;
}
