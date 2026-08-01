import { eq } from "drizzle-orm";
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
} from "@/db/schema/money";
import { workspace } from "@/db/schema/workspace";

/** Deletes all Money ledger rows for a workspace and clears its default currency. */
export async function resetMoneyWorkspaceData(workspaceId: string) {
  await db.transaction(async (tx) => {
    await tx
      .delete(moneyTransaction)
      .where(eq(moneyTransaction.workspaceId, workspaceId));
    await tx.delete(moneyBudget).where(eq(moneyBudget.workspaceId, workspaceId));
    await tx.delete(moneyRule).where(eq(moneyRule.workspaceId, workspaceId));
    await tx
      .delete(moneyRecurrentTemplate)
      .where(eq(moneyRecurrentTemplate.workspaceId, workspaceId));
    await tx
      .delete(moneyMerchant)
      .where(eq(moneyMerchant.workspaceId, workspaceId));
    await tx.delete(moneyTag).where(eq(moneyTag.workspaceId, workspaceId));
    await tx
      .delete(moneyCategory)
      .where(eq(moneyCategory.workspaceId, workspaceId));
    await tx
      .delete(moneyAccount)
      .where(eq(moneyAccount.workspaceId, workspaceId));
    await tx
      .update(workspace)
      .set({ defaultCurrency: null })
      .where(eq(workspace.id, workspaceId));
  });
}
