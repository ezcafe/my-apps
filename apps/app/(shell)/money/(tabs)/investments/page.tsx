import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { MoneyInvestmentsHome } from "@/components/money-investments-home";
import { auth } from "@/auth";
import { getQueryClient } from "@/lib/get-query-client";
import { prefetchMoneyInvestmentsHome } from "@/lib/money-ssr-prefetch";

export default async function MoneyInvestmentsPage() {
  const session = await auth();
  const userSub = session?.user?.id;
  const queryClient = getQueryClient();
  if (userSub) {
    await prefetchMoneyInvestmentsHome(queryClient);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MoneyInvestmentsHome
        userSub={userSub}
        authenticated={Boolean(userSub)}
      />
    </HydrationBoundary>
  );
}
