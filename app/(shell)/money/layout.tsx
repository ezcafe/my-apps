import type { ReactNode } from "react";
import { dehydrate } from "@tanstack/react-query";
import { MoneyRouteLayout } from "@/components/money-route-layout";
import { auth } from "@/auth";
import { getQueryClient } from "@/lib/get-query-client";
import { prefetchMoneyBootstrapForLayout } from "@/lib/money-ssr-prefetch";

export default async function MoneyLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const queryClient = getQueryClient();
  if (session?.user?.id) {
    await prefetchMoneyBootstrapForLayout(queryClient);
  }

  return (
    <MoneyRouteLayout dehydratedState={dehydrate(queryClient)}>
      {children}
    </MoneyRouteLayout>
  );
}
