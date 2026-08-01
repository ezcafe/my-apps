import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { moneyAccount, moneyCategory, moneyTag } from "@/db/schema/money";
import { moneyBudgetScopeTypeSchema } from "@/lib/validators/money";
import type { z } from "zod";

export type BudgetScope = z.infer<typeof moneyBudgetScopeTypeSchema>;

export async function assertBudgetTargetInWorkspace(
  workspaceId: string,
  scopeType: BudgetScope,
  scopeId: string | null | undefined,
): Promise<string | null> {
  if (scopeType === "workspace") return null;
  const id = scopeId;
  if (!id) return "scopeId is required";

  if (scopeType === "category") {
    const row = await db
      .select({ id: moneyCategory.id })
      .from(moneyCategory)
      .where(and(eq(moneyCategory.id, id), eq(moneyCategory.workspaceId, workspaceId)))
      .limit(1);
    if (!row.length) return "Invalid category";
    return null;
  }
  if (scopeType === "account") {
    const row = await db
      .select({ id: moneyAccount.id })
      .from(moneyAccount)
      .where(and(eq(moneyAccount.id, id), eq(moneyAccount.workspaceId, workspaceId)))
      .limit(1);
    if (!row.length) return "Invalid account";
    return null;
  }
  if (scopeType === "tag") {
    const row = await db
      .select({ id: moneyTag.id })
      .from(moneyTag)
      .where(and(eq(moneyTag.id, id), eq(moneyTag.workspaceId, workspaceId)))
      .limit(1);
    if (!row.length) return "Invalid tag";
    return null;
  }
  return "Invalid scope";
}
