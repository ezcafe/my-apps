import { eq } from "drizzle-orm";
import { db } from "@/db";
import { investmentInstrument, investmentTradeJournal } from "@/db/schema/investment";
import { loan } from "@/db/schema/loans";
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

/**
 * Deletes all workspace data across loans, investments, and money records,
 * and clears the default currency while preserving the workspace and members.
 */
export async function resetWorkspaceData(workspaceId: string) {
  await db.transaction(async (tx) => {
    // 1. Loans: cascade deletes loanScheduleInstallment and loanInstallmentStatus
    await tx.delete(loan).where(eq(loan.workspaceId, workspaceId));

    // 2. Investment trade journals: references instrument and moneyAccount
    await tx
      .delete(investmentTradeJournal)
      .where(eq(investmentTradeJournal.workspaceId, workspaceId));

    // 3. Transactions: cascade deletes moneyTransactionInvestment and moneyTransactionTag
    // Deleting transactions clears foreign keys pointing to accounts & instruments
    await tx
      .delete(moneyTransaction)
      .where(eq(moneyTransaction.workspaceId, workspaceId));

    // 4. Investment instruments: cascade deletes investmentQuote and investmentQuoteDaily
    await tx
      .delete(investmentInstrument)
      .where(eq(investmentInstrument.workspaceId, workspaceId));

    // 5. Money automation and metadata
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

    // 6. Clear default currency on workspace
    await tx
      .update(workspace)
      .set({ defaultCurrency: null })
      .where(eq(workspace.id, workspaceId));
  });
}
