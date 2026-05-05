import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { moneyCategory } from "@/db/schema/money";

/** Parent must exist, be in the workspace, and be a root (no grandparent). */
export async function assertValidCategoryParent(
  workspaceId: string,
  parentId: string,
  selfId?: string,
): Promise<string | null> {
  if (selfId && parentId === selfId) {
    return "Category cannot be its own parent";
  }
  const rows = await db
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
