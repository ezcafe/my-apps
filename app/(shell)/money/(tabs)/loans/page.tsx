import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { MoneyLoansHome } from "@/components/money-loans-home";
import { auth } from "@/auth";
import { getQueryClient } from "@/lib/get-query-client";
import { prefetchMoneyLoansHome } from "@/lib/money-ssr-prefetch";

export default async function MoneyLoansPage() {
  const session = await auth();
  const userSub = session?.user?.id;
  const queryClient = getQueryClient();
  if (userSub) {
    await prefetchMoneyLoansHome(queryClient);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MoneyLoansHome
        userSub={userSub}
        authenticated={Boolean(userSub)}
      />
    </HydrationBoundary>
  );
}
