import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { moneyCategory } from "@/db/schema/money";
import type { CategoryKind } from "@/lib/validators/money";

/**
 * Looks up a category in the workspace and asserts that its `kind` matches
 * `expectedKind`. Throws with a clear, user-facing message otherwise.
 *
 * Returns the resolved `CategoryKind` so callers can also narrow downstream types.
 */
export async function assertCategoryKindMatches(
  workspaceId: string,
  categoryId: string,
  expectedKind: CategoryKind,
): Promise<CategoryKind> {
  const [row] = await db
    .select({ kind: moneyCategory.kind })
    .from(moneyCategory)
    .where(
      and(
        eq(moneyCategory.id, categoryId),
        eq(moneyCategory.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  if (!row) throw new Error("Invalid category");
  if (row.kind !== expectedKind) {
    throw new Error(
      `Category kind '${row.kind}' does not match expected '${expectedKind}'`,
    );
  }
  return row.kind;
}
