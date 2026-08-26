import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { MoneyLoansHome } from "@/components/money-loans-home";
import { auth } from "@/auth";
import { getQueryClient } from "@/lib/get-query-client";
import { prefetchMoneyLoansHome } from "@/lib/money-ssr-prefetch";

export default async function LoansPage() {
  const session = await auth();
  const userSub = session?.user?.id;
  const queryClient = getQueryClient();
  if (userSub) {
    await prefetchMoneyLoansHome(queryClient, userSub);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MoneyLoansHome />
    </HydrationBoundary>
  );
}
