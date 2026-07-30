import { MoneyTransactionsPage } from "@/components/money-transactions-page";
import { MONEY_LEDGER_INVESTMENT } from "@/lib/money-ledger-presets";
import { auth } from "@/auth";

export default async function MoneyInvestmentsLedgerPage() {
  const session = await auth();
  const userSub = session?.user?.id;

  return (
    <MoneyTransactionsPage
      userSub={userSub}
      authenticated={Boolean(userSub)}
      preset={MONEY_LEDGER_INVESTMENT}
      viewNav={{
        menuLabel: "View",
        value: "activity",
        defaultValue: "activity",
        options: [
          {
            id: "activity",
            label: "Activity",
            href: "/money/investments",
          },
          {
            id: "portfolio",
            label: "Portfolio",
            href: "/money/investments/portfolio",
          },
        ],
      }}
    />
  );
}
