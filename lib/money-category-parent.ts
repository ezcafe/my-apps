import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { moneyCategory } from "@/db/schema/money";
import type { CategoryKind } from "@/lib/validators/money";

/**
 * Parent must exist, be in the workspace, share the same kind, and be a root
 * (no grandparent).
 */
export async function assertValidCategoryParent(
  workspaceId: string,
  parentId: string,
  kind: CategoryKind,
  selfId?: string,
): Promise<string | null> {
  if (selfId && parentId === selfId) {
    return "Category cannot be its own parent";
  }
  const rows = await db
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
