import { MoneyTransactionsPage } from "@/components/money-transactions-page";
import { MONEY_LEDGER_SAVINGS } from "@/lib/money-ledger-presets";
import { auth } from "@/auth";

export default async function MoneySavingsLedgerPage() {
  const session = await auth();
  const userSub = session?.user?.id;

  return (
    <MoneyTransactionsPage
      userSub={userSub}
      authenticated={Boolean(userSub)}
      preset={MONEY_LEDGER_SAVINGS}
    />
  );
}
