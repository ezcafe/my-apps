import { and, eq } from "drizzle-orm";
import { investmentTradeJournal } from "@/db/schema/investment";
import type { MoneyTx } from "@/lib/money-account-balance";
import { ledgerToSignedPnl } from "@/lib/investment-realized-pnl";

/** Drop closed lots whose P&L transaction was removed. */
export async function deleteJournalLotsForLedgerTransaction(
  tx: MoneyTx,
  workspaceId: string,
  transactionId: string,
): Promise<void> {
  await tx
    .delete(investmentTradeJournal)
    .where(
      and(
        eq(investmentTradeJournal.workspaceId, workspaceId),
        eq(investmentTradeJournal.closedTransactionId, transactionId),
      ),
    );
}

/** Keep value-over-time in sync when a linked P&L row is edited. */
export async function syncJournalLotsForLedgerTransaction(
  tx: MoneyTx,
  workspaceId: string,
  input: {
    transactionId: string;
    kind: string;
    amountMinor: number;
    occurredAt: Date;
    notes: string | null;
    accountId: string;
  },
): Promise<void> {
  await tx
    .update(investmentTradeJournal)
    .set({
      realizedPnlMinor: ledgerToSignedPnl(input.kind, input.amountMinor),
      closedAt: input.occurredAt,
      notes: input.notes,
      moneyAccountId: input.accountId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(investmentTradeJournal.workspaceId, workspaceId),
        eq(investmentTradeJournal.closedTransactionId, input.transactionId),
      ),
    );
}
