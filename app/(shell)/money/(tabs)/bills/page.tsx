import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { MoneyTransactionsPage } from "@/components/money-transactions-page";
import { MONEY_LEDGER_BILLS } from "@/lib/money-ledger-presets";
import { auth } from "@/auth";
import { getQueryClient } from "@/lib/get-query-client";
import { prefetchMoneyLedger } from "@/lib/money-ssr-prefetch";

export default async function MoneyBillsPage() {
  const session = await auth();
  const userSub = session?.user?.id;
  const queryClient = getQueryClient();
  if (userSub) {
    await prefetchMoneyLedger(queryClient, MONEY_LEDGER_BILLS, userSub);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MoneyTransactionsPage
        userSub={userSub}
        authenticated={Boolean(userSub)}
        preset={MONEY_LEDGER_BILLS}
        showSummaryStats
      />
    </HydrationBoundary>
  );
}
