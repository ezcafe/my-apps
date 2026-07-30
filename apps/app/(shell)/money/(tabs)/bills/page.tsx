import { MoneyTransactionsPage } from "@/components/money-transactions-page";
import { MONEY_LEDGER_BILLS } from "@/lib/money-ledger-presets";
import { auth } from "@/auth";

export default async function MoneyBillsPage() {
  const session = await auth();
  const userSub = session?.user?.id;

  return (
    <MoneyTransactionsPage
      userSub={userSub}
      authenticated={Boolean(userSub)}
      preset={MONEY_LEDGER_BILLS}
    />
  );
}
