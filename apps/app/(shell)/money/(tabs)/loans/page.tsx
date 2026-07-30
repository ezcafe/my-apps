import { MoneyTransactionsPage } from "@/components/money-transactions-page";
import { MONEY_LEDGER_LOAN } from "@/lib/money-ledger-presets";
import { auth } from "@/auth";

export default async function MoneyLoansLedgerPage() {
  const session = await auth();
  const userSub = session?.user?.id;

  return (
    <MoneyTransactionsPage
      userSub={userSub}
      authenticated={Boolean(userSub)}
      preset={MONEY_LEDGER_LOAN}
      viewNav={{
        menuLabel: "View",
        value: "activity",
        defaultValue: "activity",
        options: [
          { id: "activity", label: "Activity", href: "/money/loans" },
          {
            id: "manage",
            label: "Schedules & payments",
            href: "/money/loans/manage",
          },
        ],
      }}
    />
  );
}
